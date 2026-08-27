ALTER TABLE "system_settings"
  ADD COLUMN IF NOT EXISTS "guest_requests_per_day" integer NOT NULL DEFAULT 50;
