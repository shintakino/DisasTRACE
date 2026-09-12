-- Persist the responder-selected hospital so public tracking can recover the
-- transport route after either mobile app misses an in-memory broadcast.
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "transport_status" text DEFAULT 'NONE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "transport_hospital_id" varchar(50);
--> statement-breakpoint
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "transport_started_at" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incidents_transport_hospital_id_hospitals_id_fk'
  ) THEN
    ALTER TABLE "incidents"
      ADD CONSTRAINT "incidents_transport_hospital_id_hospitals_id_fk"
      FOREIGN KEY ("transport_hospital_id") REFERENCES "public"."hospitals"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
