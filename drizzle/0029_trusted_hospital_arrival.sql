ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "transport_arrived_at" timestamp with time zone;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_transport_status_check";

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_transport_status_check"
  CHECK ("transport_status" IN ('NONE', 'TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL'));
