-- Reporting hardening: evidence GPS, official barangay attribution, and
-- the CDRRMO-controlled duplicate-report radius. Every statement is safe
-- for databases where the emergency fixes were previously applied by the
-- temporary deployment scripts.

ALTER TABLE "verification_requests"
  ADD COLUMN IF NOT EXISTS "photo_latitude" double precision;
--> statement-breakpoint
ALTER TABLE "verification_requests"
  ADD COLUMN IF NOT EXISTS "photo_longitude" double precision;
--> statement-breakpoint
ALTER TABLE "verification_requests"
  ADD COLUMN IF NOT EXISTS "barangay" varchar(100);
--> statement-breakpoint
ALTER TABLE "verification_requests"
  ADD COLUMN IF NOT EXISTS "barangay_psgc_code" varchar(10);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_requests_barangay_idx"
  ON "verification_requests" USING btree ("barangay");
--> statement-breakpoint

-- Normalize a partially deployed setting before enforcing the runtime range.
ALTER TABLE "system_settings"
  ADD COLUMN IF NOT EXISTS "deduplication_radius_meters" integer;
--> statement-breakpoint
UPDATE "system_settings"
  SET "deduplication_radius_meters" = 250
  WHERE "deduplication_radius_meters" IS NULL
     OR "deduplication_radius_meters" < 50
     OR "deduplication_radius_meters" > 1000;
--> statement-breakpoint
ALTER TABLE "system_settings"
  ALTER COLUMN "deduplication_radius_meters" SET DEFAULT 250;
--> statement-breakpoint
ALTER TABLE "system_settings"
  ALTER COLUMN "deduplication_radius_meters" SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.system_settings'::regclass
      AND conname = 'system_settings_deduplication_radius_range'
  ) THEN
    ALTER TABLE "system_settings"
      ADD CONSTRAINT "system_settings_deduplication_radius_range"
      CHECK ("deduplication_radius_meters" BETWEEN 50 AND 1000);
  END IF;
END $$;
--> statement-breakpoint

-- Ensure the application-level DUPLICATE status is also protected at the
-- database boundary. Older deployments may already have an equivalent check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.verification_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%DUPLICATE%'
  ) THEN
    ALTER TABLE "verification_requests"
      ADD CONSTRAINT "verification_requests_status_values_check"
      CHECK ("status" IN ('PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE'));
  END IF;
END $$;
