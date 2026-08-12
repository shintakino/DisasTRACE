import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });

async function applyGuestEmergencyIntake() {
  await client.unsafe(`
    ALTER TABLE "verification_requests" ALTER COLUMN "resident_id" DROP NOT NULL;
    ALTER TABLE "verification_requests" ALTER COLUMN "image_url" DROP NOT NULL;
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "reporter_type" text DEFAULT 'REGISTERED' NOT NULL;
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "contact_number" varchar(32);
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "guest_access_token" varchar(128);
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "triage_classification" text DEFAULT 'UNCERTAIN_INCOMPLETE' NOT NULL;
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "triage_reasons" text[] DEFAULT '{}' NOT NULL;
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "coordination_agencies" text[] DEFAULT '{}' NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "verification_requests_guest_access_token_unique" ON "verification_requests" USING btree ("guest_access_token");
  `);

  const columns = await client<{
    column_name: string;
    is_nullable: string;
  }[]>`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'verification_requests'
      AND column_name IN (
        'resident_id', 'image_url', 'reporter_type', 'contact_number',
        'guest_access_token', 'triage_classification', 'triage_reasons',
        'coordination_agencies'
      )
    ORDER BY column_name
  `;
  console.table(columns);
}

applyGuestEmergencyIntake()
  .then(() => console.log('Guest emergency intake schema applied successfully.'))
  .finally(() => client.end())
  .catch((error: unknown) => {
    console.error('Guest emergency intake schema application failed:', error);
    process.exitCode = 1;
  });
