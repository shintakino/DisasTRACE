import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { isValidAmbulanceUnitId } from '../lib/ambulance-unit';

dotenv.config({ path: '.env.local' });

type ResponderUnitRow = {
  unit_id: string | null;
};

type IndexRow = {
  indexdef: string;
};

async function verifyResponderUnitIdData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    const responderRows = await sql<ResponderUnitRow[]>`
      SELECT unit_id
      FROM public.users
      WHERE role = 'ambulance_responder'
    `;
    const invalidUnitIdCount = responderRows.filter(
      ({ unit_id }) => !isValidAmbulanceUnitId(unit_id ?? ''),
    ).length;

    const indexRows = await sql<IndexRow[]>`
      SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'users_unit_id_unique'
    `;
    const hasExpectedUniqueIndex = indexRows.some(({ indexdef }) =>
      /CREATE UNIQUE INDEX users_unit_id_unique.*WHERE.*unit_id.*IS NOT NULL/i.test(indexdef),
    );

    console.log('--- Responder Unit ID Data Verification ---');
    console.log(`Responder records checked: ${responderRows.length}`);
    console.log(`Missing or malformed Unit IDs: ${invalidUnitIdCount}`);
    console.log(`Expected partial unique index: ${hasExpectedUniqueIndex ? 'present' : 'missing or malformed'}`);

    if (invalidUnitIdCount > 0 || !hasExpectedUniqueIndex) {
      process.exitCode = 1;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

verifyResponderUnitIdData().catch((error) => {
  console.error('Responder Unit ID data verification failed:', error);
  process.exitCode = 1;
});
