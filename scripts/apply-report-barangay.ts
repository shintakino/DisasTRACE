import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(process.env.DATABASE_URL, { max: 1 });

async function applyReportBarangay() {
  await client.unsafe(`
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "barangay" varchar(100);
    ALTER TABLE "verification_requests" ADD COLUMN IF NOT EXISTS "barangay_psgc_code" varchar(10);
    CREATE INDEX IF NOT EXISTS "verification_requests_barangay_idx" ON "verification_requests" ("barangay");
  `);
}

applyReportBarangay()
  .then(() => console.log('Report barangay schema applied successfully.'))
  .finally(() => client.end())
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; });
