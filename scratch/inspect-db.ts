import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing');
    return;
  }
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    console.log('1. Checking existing migrations table...');
    const migrationRows = await sql`SELECT * FROM drizzle.migrations ORDER BY id DESC LIMIT 10;`.catch(() => []);
    console.log('Applied migrations:', migrationRows);

    console.log('\n2. Inspecting verification_requests columns...');
    const columns = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_requests';
    `;
    console.log('Columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (default: ${col.column_default}, nullable: ${col.is_nullable})`);
    });

    console.log('\n3. Checking for check constraints on verification_requests...');
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'verification_requests';
    `;
    console.log('Constraints:', constraints);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

main();
