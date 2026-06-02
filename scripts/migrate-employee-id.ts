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
    console.log('Running employee_id column migration...');
    
    // Execute the ALTER TABLE statements
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);`;
    console.log('Successfully added employee_id column if not exists.');
    
    // Update existing seed accounts
    await sql`UPDATE public.users SET employee_id = 'ADMIN-001' WHERE email = 'admin@disastrace.com';`;
    console.log('Successfully set employee_id for admin@disastrace.com.');
    
    await sql`UPDATE public.users SET employee_id = 'PACC-001' WHERE email = 'pacc@disastrace.com';`;
    console.log('Successfully set employee_id for pacc@disastrace.com.');

    console.log('Employee ID migration completed successfully.');
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
