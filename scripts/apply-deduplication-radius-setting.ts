import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
const client = postgres(process.env.DATABASE_URL, { max: 1 });
client.unsafe('ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "deduplication_radius_meters" integer NOT NULL DEFAULT 250;')
  .then(() => console.log('Deduplication radius setting schema applied successfully.'))
  .finally(() => client.end())
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
