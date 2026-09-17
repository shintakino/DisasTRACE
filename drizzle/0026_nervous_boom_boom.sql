ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_name" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "actor_role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_policy_version" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "audit_logs" AS audit
SET "actor_name" = app_user."full_name", "actor_role" = app_user."role"
FROM "users" AS app_user
WHERE audit."user_id" = app_user."id"
  AND (audit."actor_name" IS NULL OR audit."actor_role" IS NULL);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
DECLARE
  user_role text;
  consent_at timestamptz;
BEGIN
  user_role := coalesce((new.raw_user_meta_data::jsonb)->>'role', 'public_user');
  BEGIN
    consent_at := nullif((new.raw_user_meta_data::jsonb)->>'privacy_consent_at', '')::timestamptz;
  EXCEPTION WHEN others THEN
    consent_at := null;
  END;

  INSERT INTO public.users (
    id, full_name, email, role, verification_status, status, phone, address,
    id_type, created_at, updated_at, responder_type, barangay,
    privacy_consent_at, privacy_policy_version
  ) VALUES (
    new.id::text,
    coalesce(
      (new.raw_user_meta_data::jsonb)->>'full_name',
      trim(coalesce((new.raw_user_meta_data::jsonb)->>'first_name', '') || ' ' || coalesce((new.raw_user_meta_data::jsonb)->>'last_name', '')),
      'User'
    ),
    new.email,
    user_role,
    CASE WHEN user_role = 'public_user' THEN 'PENDING' ELSE 'APPROVED' END,
    CASE WHEN user_role = 'public_user' THEN 'PENDING' ELSE 'ACTIVE' END,
    (new.raw_user_meta_data::jsonb)->>'phone',
    (new.raw_user_meta_data::jsonb)->>'address',
    (new.raw_user_meta_data::jsonb)->>'id_type',
    now(), now(),
    (new.raw_user_meta_data::jsonb)->>'responder_type',
    (new.raw_user_meta_data::jsonb)->>'barangay',
    consent_at,
    nullif((new.raw_user_meta_data::jsonb)->>'privacy_policy_version', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
