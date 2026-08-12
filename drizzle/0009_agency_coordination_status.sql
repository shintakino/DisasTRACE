ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "coordination_agencies" text[] DEFAULT '{}' NOT NULL;
