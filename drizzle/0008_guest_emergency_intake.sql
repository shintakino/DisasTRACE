ALTER TABLE "verification_requests" ALTER COLUMN "resident_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "verification_requests" ALTER COLUMN "image_url" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "reporter_type" text DEFAULT 'REGISTERED' NOT NULL;
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "contact_number" varchar(32);
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "guest_access_token" varchar(128);
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "triage_classification" text DEFAULT 'UNCERTAIN_INCOMPLETE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "triage_reasons" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "verification_requests_guest_access_token_unique" ON "verification_requests" USING btree ("guest_access_token");
