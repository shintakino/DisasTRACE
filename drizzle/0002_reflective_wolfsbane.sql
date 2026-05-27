ALTER TABLE "incidents" ADD COLUMN "dispatch_offer_duration_seconds" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "duty_status" text DEFAULT 'OFF_DUTY' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_latitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_longitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_location_updated_at" timestamp with time zone;