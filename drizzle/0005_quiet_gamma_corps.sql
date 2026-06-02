CREATE TABLE "phone_verifications" (
	"phone" varchar(20) PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "employee_id" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location_geom" geometry(Point, 4326);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otp_code" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "otp_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "users_location_geom_gist_idx" ON "users" USING gist ("location_geom");