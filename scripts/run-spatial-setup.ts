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
  console.log('🔄 Connecting to database and running PostGIS Spatial Indexing setup...');

  try {
    const sqlPath = path.join(__dirname, '../drizzle/0005_add_gist_spatial_indexing.sql');
    const sqlText = fs.readFileSync(sqlPath, 'utf8');

    console.log('⚡ Executing SQL script...');
    await sql.unsafe(sqlText);
    
    console.log('✅ PostGIS, Geometry column, GiST index, and trigger successfully initialized in database!');
  } catch (err) {
    console.error('❌ Failed to run spatial setup script:', err);
  } finally {
    await sql.end();
  }
};

run();
