-- Guest Mode keeps only a SHA-256 Android app-scoped device digest. The raw
-- Android ID never reaches persistent storage.
ALTER TABLE "verification_requests"
  ADD COLUMN IF NOT EXISTS "guest_device_hash" varchar(64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_requests_guest_device_hash_idx"
  ON "verification_requests" USING btree ("guest_device_hash")
  WHERE "guest_device_hash" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_device_report_quotas" (
  "device_hash" varchar(64) PRIMARY KEY NOT NULL,
  "report_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "guest_device_report_quotas_report_count_nonnegative" CHECK ("report_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "guest_device_report_quotas" ENABLE ROW LEVEL SECURITY;
