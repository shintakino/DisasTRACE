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
    console.log('Altering notifications table to REPLICA IDENTITY FULL...');
    
    await sql`ALTER TABLE public.notifications REPLICA IDENTITY FULL;`;
    console.log('Successfully set REPLICA IDENTITY FULL on public.notifications table.');

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
