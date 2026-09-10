-- Mobile users may have one active application device at a time. Raw Android
-- IDs are intentionally never stored; the API persists a SHA-256 digest only.
CREATE TABLE IF NOT EXISTS "mobile_device_sessions" (
  "user_id" varchar(255) PRIMARY KEY NOT NULL,
  "device_hash" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mobile_device_sessions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mobile_device_sessions_last_seen_at_idx"
  ON "mobile_device_sessions" USING btree ("last_seen_at");
