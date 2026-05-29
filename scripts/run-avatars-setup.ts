import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const run = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL missing from .env.local');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  console.log('🔄 Connecting to database and running avatars storage setup...');

  try {
    const sqlPath = path.join(__dirname, '../db/avatars-storage-setup.sql');
    const sqlText = fs.readFileSync(sqlPath, 'utf8');

    console.log('⚡ Executing SQL script...');
    await sql.unsafe(sqlText);
    
    console.log('✅ Avatars storage bucket and RLS policies successfully initialized in database!');
  } catch (err) {
    console.error('❌ Failed to run avatars setup script:', err);
  } finally {
    await sql.end();
  }
};

run();
