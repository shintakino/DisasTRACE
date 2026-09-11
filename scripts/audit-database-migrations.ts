import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

type MigrationLedgerRow = {
  id: number;
  hash: string;
  created_at: number | null;
};

type Journal = {
  entries: Array<{ tag: string; when: number }>;
};

const migrationDirectory = join(process.cwd(), 'drizzle');
const allMigrationFiles = readdirSync(migrationDirectory)
  .filter((fileName) => fileName.endsWith('.sql'))
  .sort();
const journal = JSON.parse(
  readFileSync(join(migrationDirectory, 'meta', '_journal.json'), 'utf8'),
) as Journal;
const canonicalFileNames = new Set(journal.entries.map((entry) => `${entry.tag}.sql`));
const migrationFiles = allMigrationFiles.filter((fileName) => canonicalFileNames.has(fileName));
const nonJournalFiles = allMigrationFiles.filter((fileName) => !canonicalFileNames.has(fileName));

const localMigrations = migrationFiles.map((fileName) => ({
  fileName,
  hash: createHash('sha256')
    .update(readFileSync(join(migrationDirectory, fileName)))
    .digest('hex'),
}));

const expectedTables = [
  'audit_logs',
  'incidents',
  'users',
  'reports',
  'status_logs',
  'verification_requests',
  'notifications',
  'faqs',
  'feedbacks',
  'hospitals',
  'system_settings',
  'support_settings',
  'phone_verifications',
  'support_messages',
  'guest_device_report_quotas',
];

const expectedColumns = [
  ['system_settings', 'guest_requests_per_day'],
  ['system_settings', 'guest_reports_per_phone_limit'],
  ['system_settings', 'dispatch_offer_timeout_seconds'],
  ['users', 'location_geom'],
  ['users', 'duty_status'],
  ['users', 'responder_type'],
  ['verification_requests', 'reporter_type'],
  ['verification_requests', 'guest_access_token'],
  ['verification_requests', 'guest_device_hash'],
  ['verification_requests', 'triage_classification'],
  ['verification_requests', 'coordination_agencies'],
  ['verification_requests', 'photo_latitude'],
  ['verification_requests', 'photo_longitude'],
  ['verification_requests', 'barangay'],
  ['verification_requests', 'barangay_psgc_code'],
  ['incidents', 'dispatch_offer_duration_seconds'],
  ['system_settings', 'deduplication_radius_meters'],
] as const;

async function audit() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const ledger = await sql<MigrationLedgerRow[]>`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY id
    `;
    const appliedHashes = new Set(ledger.map((row) => row.hash));
    const localHashes = new Set(localMigrations.map((migration) => migration.hash));
    const unapplied = localMigrations.filter((migration) => !appliedHashes.has(migration.hash));
    const unknownApplied = ledger.filter((row) => !localHashes.has(row.hash));

    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;
    const tableSet = new Set(tables.map((row) => row.table_name));

    const columns = await sql<{ table_name: string; column_name: string }[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
    const columnSet = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`));
    const missingTables = expectedTables.filter((table) => !tableSet.has(table));
    const missingColumns = expectedColumns
      .map(([table, column]) => `${table}.${column}`)
      .filter((column) => !columnSet.has(column));

    const expectedIndexes = [
      'feedbacks_user_incident_idx',
      'users_location_geom_gist_idx',
      'users_location_geom_geog_gist_idx',
      'verification_requests_guest_access_token_unique',
      'verification_requests_guest_device_hash_idx',
      'verification_requests_barangay_idx',
    ];
    const indexes = await sql<{ indexname: string }[]>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;
    const indexSet = new Set(indexes.map((row) => row.indexname));
    const missingIndexes = expectedIndexes.filter((index) => !indexSet.has(index));

    const triggers = await sql<{ trigger_name: string }[]>`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
    `;
    const triggerSet = new Set(triggers.map((row) => row.trigger_name));
    const missingTriggers = ['trg_update_location_geom']
      .filter((trigger) => !triggerSet.has(trigger));

    const deduplicationConstraints = await sql<{ conname: string }[]>`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.system_settings'::regclass
        AND conname = 'system_settings_deduplication_radius_range'
    `;
    const missingDeduplicationConstraint = deduplicationConstraints.length === 0;

    const nullableColumns = await sql<{ table_name: string; column_name: string; is_nullable: string }[]>`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('verification_requests', 'resident_id'),
          ('verification_requests', 'image_url')
        )
    `;
    const nullableColumnSet = new Set(
      nullableColumns
        .filter((row) => row.is_nullable === 'YES')
        .map((row) => `${row.table_name}.${row.column_name}`),
    );
    const missingNullableColumns = [
      'verification_requests.resident_id',
      'verification_requests.image_url',
    ].filter((column) => !nullableColumnSet.has(column));

    console.log('--- Database Migration Audit ---');
    console.log(`Local SQL migration files: ${allMigrationFiles.length}`);
    console.log(`Canonical journal migrations: ${localMigrations.length}`);
    console.log(`Database ledger rows: ${ledger.length}`);
    console.log(`Ledger entries matching local files: ${ledger.length - unknownApplied.length}`);
    console.log(`Unapplied canonical migrations: ${unapplied.length}`);
    for (const migration of unapplied) console.log(`  UNAPPLIED_CANONICAL ${migration.fileName}`);
    console.log(`Non-journal SQL files: ${nonJournalFiles.length}`);
    for (const fileName of nonJournalFiles) console.log(`  NON_JOURNAL_FILE ${fileName}`);
    console.log(`Unknown database ledger entries: ${unknownApplied.length}`);
    for (const row of unknownApplied) console.log(`  UNKNOWN_LEDGER id=${row.id} hash=${row.hash}`);
    console.log(`Missing expected tables: ${missingTables.length}`);
    for (const table of missingTables) console.log(`  MISSING_TABLE ${table}`);
    console.log(`Missing expected columns: ${missingColumns.length}`);
    for (const column of missingColumns) console.log(`  MISSING_COLUMN ${column}`);
    console.log(`Missing expected indexes: ${missingIndexes.length}`);
    for (const index of missingIndexes) console.log(`  MISSING_INDEX ${index}`);
    console.log(`Missing expected triggers: ${missingTriggers.length}`);
    for (const trigger of missingTriggers) console.log(`  MISSING_TRIGGER ${trigger}`);
    console.log(`Guest nullable-column mismatches: ${missingNullableColumns.length}`);
    for (const column of missingNullableColumns) console.log(`  NULLABILITY_MISMATCH ${column}`);
    console.log(`Missing deduplication-radius constraint: ${missingDeduplicationConstraint ? 1 : 0}`);
    if (missingDeduplicationConstraint) console.log('  MISSING_CONSTRAINT system_settings_deduplication_radius_range');

    const duplicatePrefixes = new Map<string, string[]>();
    for (const migration of localMigrations) {
      const prefix = migration.fileName.split('_', 1)[0];
      const files = duplicatePrefixes.get(prefix) ?? [];
      files.push(migration.fileName);
      duplicatePrefixes.set(prefix, files);
    }
    for (const [prefix, files] of duplicatePrefixes) {
      if (files.length > 1) console.log(`  DUPLICATE_PREFIX ${prefix}: ${files.join(', ')}`);
    }

    if (
      unapplied.length
      || unknownApplied.length
      || missingTables.length
      || missingColumns.length
      || missingIndexes.length
      || missingTriggers.length
      || missingNullableColumns.length
      || missingDeduplicationConstraint
    ) {
      process.exitCode = 1;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

audit().catch((error) => {
  console.error('Migration audit failed:', error);
  process.exitCode = 1;
});
