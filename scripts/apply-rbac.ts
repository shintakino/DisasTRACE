import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';

async function applyRbac() {
  console.log('--- Applying RBAC Setup SQL ---');
  
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');

    const sqlPath = path.join(process.cwd(), 'db', 'rbac-setup.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // We can run the entire SQL block at once using db.execute(sql.raw(...))
    console.log('Running SQL...');
    await db.execute(sql.raw(sqlContent));
    console.log('SQL executed successfully!');

  } catch (error) {
    console.error('Error executing RBAC SQL:', error);
  } finally {
    process.exit(0);
  }
}

applyRbac().catch(console.error);
