import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type Journal = {
  entries: Array<{ tag: string; when: number }>;
};

type LedgerRow = {
  id: number;
  hash: string;
  created_at: number | null;
};

const apply = process.argv.includes('--apply');
const journal = JSON.parse(
  readFileSync(join(process.cwd(), 'drizzle', 'meta', '_journal.json'), 'utf8'),
) as Journal;
const canonicalMigrations = journal.entries.map((entry) => {
  const fileName = `${entry.tag}.sql`;
  const filePath = join(process.cwd(), 'drizzle', fileName);
  return {
    fileName,
    hash: createHash('sha256').update(readFileSync(filePath)).digest('hex'),
    folderMillis: entry.when,
  };
});

const expectedTables = [
  'audit_logs', 'incidents', 'users', 'reports', 'status_logs',
  'verification_requests', 'notifications', 'faqs', 'feedbacks',
  'hospitals', 'system_settings', 'support_settings',
  'phone_verifications', 'support_messages',
];

const expectedColumns = [
  ['system_settings', 'guest_requests_per_day'],
  ['system_settings', 'dispatch_offer_timeout_seconds'],
  ['users', 'location_geom'],
  ['users', 'duty_status'],
  ['users', 'responder_type'],
  ['verification_requests', 'reporter_type'],
  ['verification_requests', 'guest_access_token'],
  ['verification_requests', 'triage_classification'],
  ['verification_requests', 'coordination_agencies'],
  ['incidents', 'dispatch_offer_duration_seconds'],
] as const;

async function repair() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const result = await sql.begin(async (tx) => {
      const tables = await tx<{ table_name: string }[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      const tableSet = new Set(tables.map((row) => row.table_name));
      const missingTables = expectedTables.filter((table) => !tableSet.has(table));

      const columns = await tx<{ table_name: string; column_name: string }[]>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
      `;
      const columnSet = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`));
      const missingColumns = expectedColumns
        .map(([table, column]) => `${table}.${column}`)
        .filter((column) => !columnSet.has(column));

      const indexes = await tx<{ indexname: string }[]>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
      `;
      const indexSet = new Set(indexes.map((row) => row.indexname));
      const missingIndexes = [
        'feedbacks_user_incident_idx',
        'users_location_geom_gist_idx',
        'users_location_geom_geog_gist_idx',
        'verification_requests_guest_access_token_unique',
      ].filter((index) => !indexSet.has(index));

      const triggers = await tx<{ trigger_name: string }[]>`
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
      `;
      const triggerSet = new Set(triggers.map((row) => row.trigger_name));
      const missingTriggers = ['trg_update_location_geom']
        .filter((trigger) => !triggerSet.has(trigger));

      const nullableColumns = await tx<{
        table_name: string;
        column_name: string;
        is_nullable: string;
      }[]>`
        SELECT table_name, column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (table_name, column_name) IN (
            ('verification_requests', 'resident_id'),
            ('verification_requests', 'image_url')
          )
      `;
      const nullableSet = new Set(
        nullableColumns
          .filter((row) => row.is_nullable === 'YES')
          .map((row) => `${row.table_name}.${row.column_name}`),
      );
      const missingNullableColumns = [
        'verification_requests.resident_id',
        'verification_requests.image_url',
      ].filter((column) => !nullableSet.has(column));

      if (
        missingTables.length
        || missingColumns.length
        || missingIndexes.length
        || missingTriggers.length
        || missingNullableColumns.length
      ) {
        throw new Error(JSON.stringify({
          missingTables,
          missingColumns,
          missingIndexes,
          missingTriggers,
          missingNullableColumns,
        }));
      }

      const ledger = await tx<LedgerRow[]>`
        SELECT id, hash, created_at
        FROM drizzle.__drizzle_migrations
        ORDER BY created_at
        FOR UPDATE
      `;
      const appliedHashes = new Set(ledger.map((row) => row.hash));
      const canonicalHashes = new Set(canonicalMigrations.map((migration) => migration.hash));
      const unknownLedgerRows = ledger.filter((row) => !canonicalHashes.has(row.hash));
      if (unknownLedgerRows.length) {
        throw new Error(`Unknown migration ledger hashes found: ${unknownLedgerRows.map((row) => row.hash).join(', ')}`);
      }

      const missingMigrations = canonicalMigrations
        .filter((migration) => !appliedHashes.has(migration.hash));
      const latestCreatedAt = ledger.length
        ? Number(ledger[ledger.length - 1].created_at ?? 0)
        : 0;
      if (missingMigrations.some((migration) => migration.folderMillis <= latestCreatedAt)) {
        throw new Error('Migration ledger has a missing entry before or at its latest recorded timestamp. Refusing automatic repair.');
      }

      console.log(`Schema invariants verified. Ledger rows: ${ledger.length}. Missing canonical rows: ${missingMigrations.length}.`);
      for (const migration of missingMigrations) {
        console.log(`  ${apply ? 'INSERTING' : 'WOULD_INSERT'} ${migration.fileName}`);
      }

      if (apply) {
        for (const migration of missingMigrations) {
          await tx`
            INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
            VALUES (${migration.hash}, ${migration.folderMillis})
          `;
        }
      }

      return missingMigrations.length;
    });

    console.log(apply
      ? `Migration ledger repair committed. Added ${result} canonical rows.`
      : 'Dry run only. Re-run with --apply to commit the ledger repair.');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

repair().catch((error) => {
  console.error('Migration ledger repair failed:', error);
  process.exitCode = 1;
});
