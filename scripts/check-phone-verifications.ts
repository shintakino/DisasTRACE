import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const checkTable = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  console.log('Connecting to database...');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Checking if public.phone_verifications exists...');
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications'
      );
    `;
    const exists = result[0].exists;
    console.log(`Table 'phone_verifications' exists: ${exists}`);

    if (!exists) {
      console.log('Creating table public.phone_verifications...');
      await sql`
        CREATE TABLE IF NOT EXISTS public.phone_verifications (
          phone VARCHAR(20) PRIMARY KEY,
          code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        );
      `;
      console.log("Table 'phone_verifications' created successfully.");
    } else {
      // Let's also inspect the columns just in case
      const columns = await sql`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'phone_verifications';
      `;
      console.log('Columns in phone_verifications:', columns);
    }
  } catch (error) {
    console.error('Check/Creation failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
};

checkTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
