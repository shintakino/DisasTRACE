-- Guest Mode is intentionally limited per normalized phone number for the
-- lifetime of the guest account. The older daily aggregate setting remains
-- untouched for backward-compatible deployments but is no longer enforced.
ALTER TABLE "system_settings"
  ADD COLUMN IF NOT EXISTS "guest_reports_per_phone_limit" integer;
--> statement-breakpoint
UPDATE "system_settings"
  SET "guest_reports_per_phone_limit" = 3
  WHERE "guest_reports_per_phone_limit" IS NULL
     OR "guest_reports_per_phone_limit" < 1
     OR "guest_reports_per_phone_limit" > 100;
--> statement-breakpoint
ALTER TABLE "system_settings"
  ALTER COLUMN "guest_reports_per_phone_limit" SET DEFAULT 3;
--> statement-breakpoint
ALTER TABLE "system_settings"
  ALTER COLUMN "guest_reports_per_phone_limit" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_guest_reports_per_phone_limit_range'
  ) THEN
    ALTER TABLE "system_settings"
      ADD CONSTRAINT "system_settings_guest_reports_per_phone_limit_range"
      CHECK ("guest_reports_per_phone_limit" BETWEEN 1 AND 100);
  END IF;
END $$;
