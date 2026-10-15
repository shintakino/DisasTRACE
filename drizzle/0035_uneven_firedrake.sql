CREATE TABLE "system_broadcasts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target_role" text NOT NULL,
	"eligible_count" integer DEFAULT 0 NOT NULL,
	"persisted_count" integer DEFAULT 0 NOT NULL,
	"opted_out_count" integer DEFAULT 0 NOT NULL,
	"inactive_count" integer DEFAULT 0 NOT NULL,
	"missing_auth_count" integer DEFAULT 0 NOT NULL,
	"push_eligible_count" integer DEFAULT 0 NOT NULL,
	"push_accepted_count" integer DEFAULT 0 NOT NULL,
	"push_failed_count" integer DEFAULT 0 NOT NULL,
	"push_failure_reason" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "broadcast_id" varchar(255);--> statement-breakpoint
ALTER TABLE "system_broadcasts" ADD CONSTRAINT "system_broadcasts_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_broadcast_id_system_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."system_broadcasts"("id") ON DELETE set null ON UPDATE no action;