ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "field_outcome" text,
  ADD COLUMN IF NOT EXISTS "field_response_completed_at" timestamp with time zone;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_status_check";

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_status_check"
  CHECK ("status" IN ('DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'DOCUMENTATION_PENDING', 'RESOLVED'));

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_field_outcome_check";

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_field_outcome_check"
  CHECK ("field_outcome" IS NULL OR "field_outcome" IN ('HANDLED_ON_SCENE', 'PATIENT_REFUSED', 'HOSPITAL_ARRIVAL'));
