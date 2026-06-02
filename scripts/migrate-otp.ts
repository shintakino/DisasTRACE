import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  console.log('Connecting to database...');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Running OTP columns migration...');
    
    // Execute the ALTER TABLE statements
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(255);`;
    console.log('Successfully added otp_code column if not exists.');
    
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;`;
    console.log('Successfully added otp_expires_at column if not exists.');

    console.log('OTP columns migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
};

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
