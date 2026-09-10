-- Bind each permitted mobile account to the Supabase Auth session_id carried
-- by its JWT. This protects both the supported mobile app and modified/older
-- clients that attempt to call PostgREST directly.
ALTER TABLE "mobile_device_sessions"
  ADD COLUMN IF NOT EXISTS "active_session_id" uuid;
--> statement-breakpoint

-- Pre-enforcement records have only a device digest, not a session identity.
-- Clearing them deliberately requires an updated app to sign in once after
-- rollout instead of silently trusting a legacy bearer token.
DELETE FROM "mobile_device_sessions" WHERE "active_session_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "mobile_device_sessions"
  ALTER COLUMN "active_session_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mobile_device_sessions_active_session_id_idx"
  ON "mobile_device_sessions" USING btree ("active_session_id");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.has_valid_application_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    WHERE u.id = auth.uid()::text
      AND (
        u.role IN ('pacc_admin', 'cdrrmo_super_admin')
        OR (
          u.role IN ('public_user', 'ambulance_responder')
          AND EXISTS (
            SELECT 1
            FROM public.mobile_device_sessions AS s
            WHERE s.user_id = u.id
              AND s.active_session_id::text = (auth.jwt() ->> 'session_id')
          )
        )
      )
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.has_valid_application_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_valid_application_session() TO authenticated;
--> statement-breakpoint

-- These tables were previously exposed without RLS. A valid CDRRMO/PACC
-- dashboard session remains allowed, while a resident/responder must match
-- the active device + auth-session binding. The session table itself is not
-- exposed to clients at all.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'audit_logs', 'driver_trip_tickets', 'faqs', 'feedbacks', 'hospitals',
    'incidents', 'notifications', 'patient_care_reports',
    'phone_verifications', 'reports', 'status_logs', 'support_messages',
    'support_settings', 'system_settings', 'users', 'verification_requests'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('DROP POLICY IF EXISTS application_session_required ON public.%I', target_table);
    EXECUTE format(
      'CREATE POLICY application_session_required ON public.%I FOR ALL TO authenticated USING (public.has_valid_application_session()) WITH CHECK (public.has_valid_application_session())',
      target_table
    );
  END LOOP;

  ALTER TABLE public.mobile_device_sessions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS application_session_required ON public.mobile_device_sessions;
END;
$$;
--> statement-breakpoint

-- Keep direct mobile uploads subject to exactly the same session binding.
DROP POLICY IF EXISTS "Allow self-upload" ON storage.objects;
CREATE POLICY "Allow self-upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'user-ids'
    AND (storage.foldername(name))[1] = 'ids'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.has_valid_application_session()
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow self-view" ON storage.objects;
CREATE POLICY "Allow self-view" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'user-ids'
    AND (storage.foldername(name))[1] = 'ids'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND public.has_valid_application_session()
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow Super Admin view all" ON storage.objects;
CREATE POLICY "Allow Super Admin view all" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'user-ids'
    AND public.has_valid_application_session()
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'cdrrmo_super_admin'
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow self avatar upload" ON storage.objects;
CREATE POLICY "Allow self avatar upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_valid_application_session()
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow self avatar update" ON storage.objects;
CREATE POLICY "Allow self avatar update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_valid_application_session()
  ) WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_valid_application_session()
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow self avatar delete" ON storage.objects;
CREATE POLICY "Allow self avatar delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_valid_application_session()
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "Allow session incident photo upload" ON storage.objects;
CREATE POLICY "Allow session incident photo upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'incident-photos'
    AND public.has_valid_application_session()
  );
