ALTER TABLE "users" ADD COLUMN "unit_id" varchar(50);--> statement-breakpoint
UPDATE "users"
SET "unit_id" = 'AMB-' || COALESCE(NULLIF(SUBSTRING(REGEXP_REPLACE(UPPER("full_name"), '[^A-Z0-9]', '', 'g') FROM 1 FOR 3), ''), '001') || '-' || UPPER(RIGHT(REGEXP_REPLACE("id", '-', '', 'g'), 8))
WHERE "role" = 'ambulance_responder' AND "unit_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_unit_id_unique" ON "users" USING btree ("unit_id") WHERE "users"."unit_id" IS NOT NULL;
