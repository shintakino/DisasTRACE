ALTER TABLE "users" ADD COLUMN "last_location_accuracy" double precision;--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_request_id_unique" ON "incidents" USING btree ("request_id") WHERE "created_at" >= '2026-09-15 00:00:00+08'::timestamptz;
