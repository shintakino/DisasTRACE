import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is missing from .env.local');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  console.log('🔄 Connecting to database to apply Duplicate Report Handling schema updates...');

  try {
    // 1. Add parent_request_id column to verification_requests
    console.log('⚡ Adding parent_request_id column to verification_requests table...');
    await sql`
      ALTER TABLE public.verification_requests 
      ADD COLUMN IF NOT EXISTS parent_request_id VARCHAR(255);
    `;

    // 2. Add self-referential foreign key constraint if it does not exist
    console.log('⚡ Adding self-referential foreign key constraint to verification_requests...');
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'verification_requests_parent_request_id_fk'
        ) THEN
          ALTER TABLE public.verification_requests 
          ADD CONSTRAINT verification_requests_parent_request_id_fk 
          FOREIGN KEY (parent_request_id) 
          REFERENCES public.verification_requests(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `;

    // 3. Drop existing status check constraint if it exists (in case a constraint was added manually)
    console.log('⚡ Checking for existing status check constraints...');
    const existingConstraints = await sql`
      SELECT conname 
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'verification_requests' 
        AND c.conname LIKE '%status%';
    `;
    
    for (const row of existingConstraints) {
      console.log(`🔥 Dropping existing constraint: ${row.conname}`);
      await sql.unsafe(`ALTER TABLE public.verification_requests DROP CONSTRAINT IF EXISTS ${row.conname};`);
    }

    // 4. Create check constraint to ensure only valid statuses (including DUPLICATE) are allowed
    console.log('⚡ Adding check constraint for status values (PENDING, VERIFIED, REJECTED, DUPLICATE)...');
    await sql`
      ALTER TABLE public.verification_requests
      ADD CONSTRAINT verification_requests_status_check
      CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE'));
    `;

    console.log('✅ Schema migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
