import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });

async function applyPhotoGeotag() {
  await client.unsafe(`
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "photo_latitude" double precision;
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "photo_longitude" double precision;
  `);
}

applyPhotoGeotag()
  .then(() => console.log('Photo geotag schema applied successfully.'))
  .finally(() => client.end())
  .catch((error: unknown) => {
    console.error('Photo geotag schema application failed:', error);
    process.exitCode = 1;
  });
