DROP INDEX "incidents_request_id_unique";--> statement-breakpoint
DROP INDEX "reports_incident_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_request_id_unique" ON "incidents" USING btree ("request_id") WHERE "incidents"."created_at" >= '2026-09-15 00:00:00+08'::timestamptz;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_incident_id_unique" ON "reports" USING btree ("incident_id") WHERE "reports"."created_at" >= '2026-09-15 00:00:00'::timestamp;