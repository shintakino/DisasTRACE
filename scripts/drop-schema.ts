import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const runDrop = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  
  console.log('Dropping tables...');
  await sql`DROP TABLE IF EXISTS audit_logs, status_logs, reports, incidents, verification_requests, users CASCADE;`;
  
  // also drop the drizzle migrations table to ensure a clean slate
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`;
  
  console.log('Tables dropped successfully.');
  process.exit(0);
};

runDrop().catch(console.error);
