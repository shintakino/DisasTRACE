CREATE TABLE "mobile_push_tokens" (
  "user_id" varchar(255) PRIMARY KEY NOT NULL,
  "push_token" text NOT NULL UNIQUE,
  "session_id" uuid NOT NULL,
  "platform" varchar(32) DEFAULT 'android' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "mobile_push_tokens_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action
);
