ALTER TABLE "reports" ADD COLUMN "archived_at" timestamp;
CREATE INDEX "reports_responder_archive_created_idx" ON "reports" USING btree ("responder_id","archived_at","created_at");
