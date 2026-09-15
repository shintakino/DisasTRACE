CREATE UNIQUE INDEX "reports_incident_id_unique" ON "reports" USING btree ("incident_id") WHERE "created_at" >= '2026-09-15 00:00:00'::timestamp;
