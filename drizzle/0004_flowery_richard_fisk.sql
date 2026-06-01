CREATE TABLE "faqs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"incident_id" varchar(36) NOT NULL,
	"report_id" varchar(50),
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" varchar(255) NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"caters" boolean DEFAULT true NOT NULL,
	"phone" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"dispatch_offer_timeout_seconds" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_settings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"phone" varchar(50) DEFAULT '(044) 761-0000' NOT NULL,
	"email" varchar(255) DEFAULT 'cdrrmobaliwag@gmail.com' NOT NULL,
	"address" text DEFAULT 'Baliwag Government Center, Brgy. Bagong Nayon, Baliwag City, Bulacan' NOT NULL,
	"privacy_policy" text DEFAULT 'Your data is secured and managed in accordance with the Data Privacy Act of 2012. We only collect information necessary for emergency response dispatching.' NOT NULL,
	"privacy_policy_full" text DEFAULT 'DisasTRACE collects only the minimum data necessary for emergency response operations, including your name, contact number, location coordinates, and incident imagery. This data is used exclusively for dispatching ambulance responders and maintaining city-wide safety records.

All personal information is encrypted in transit and at rest using industry-standard TLS and AES-256 protocols. Access to your data is restricted to authorized CDRRMO personnel only. We do not sell, share, or distribute your personal information to any third parties.

Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to access, correct, and request deletion of your personal data. For any concerns, contact the CDRRMO Data Protection Officer through the Help & Support section.' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verification_requests" ADD COLUMN "parent_request_id" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "feedbacks_user_incident_idx" ON "feedbacks" USING btree ("user_id","incident_id");--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_parent_request_id_verification_requests_id_fk" FOREIGN KEY ("parent_request_id") REFERENCES "public"."verification_requests"("id") ON DELETE no action ON UPDATE no action;