ALTER TABLE "users" ADD COLUMN "privacy_consent_given" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "users"
SET "privacy_consent_given" = true
WHERE "privacy_consent_at" IS NOT NULL
  AND "privacy_policy_version" IS NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
DECLARE
  user_role text;
  consent_at timestamptz;
  policy_version text;
  consent_given boolean;
BEGIN
  user_role := coalesce((new.raw_user_meta_data::jsonb)->>'role', 'public_user');
  BEGIN
    consent_at := nullif((new.raw_user_meta_data::jsonb)->>'privacy_consent_at', '')::timestamptz;
  EXCEPTION WHEN others THEN
    consent_at := null;
  END;
  policy_version := nullif((new.raw_user_meta_data::jsonb)->>'privacy_policy_version', '');
  BEGIN
    consent_given := coalesce(
      nullif((new.raw_user_meta_data::jsonb)->>'privacy_policy_accepted', '')::boolean,
      false
    );
  EXCEPTION WHEN others THEN
    consent_given := false;
  END;

  IF user_role = 'public_user' AND (
    NOT consent_given
    OR consent_at IS NULL
    OR policy_version IS NULL
  ) THEN
    RAISE EXCEPTION 'Public User registration requires explicit Data Privacy consent.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.users (
    id, full_name, email, role, verification_status, status, phone, address,
    id_type, created_at, updated_at, responder_type, barangay,
    privacy_consent_at, privacy_policy_version, privacy_consent_given
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
    policy_version,
    consent_given
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
