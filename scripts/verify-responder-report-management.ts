import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseResponderReportArchivePayload,
  parseResponderReportListQuery,
} from '../lib/responder-report-management';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('normalizes bounded responder list query values', () => {
  assert.deepEqual(parseResponderReportListQuery(new URLSearchParams()), {
    search: undefined,
    type: undefined,
    status: 'all',
    archive: 'active',
    sort: 'newest',
    createdAfter: undefined,
    createdBefore: undefined,
    page: 1,
    limit: 15,
  });

  assert.deepEqual(parseResponderReportListQuery(new URLSearchParams({
    search: '  REP-2026  ',
    type: ' Medical Emergency ',
    status: 'completed',
    archive: 'archived',
    sort: 'oldest',
    createdAfter: '2026-09-01T00:00:00.000Z',
    createdBefore: '2026-10-01T00:00:00.000Z',
    page: '3',
    limit: '25',
  })), {
    search: 'REP-2026',
    type: 'Medical Emergency',
    status: 'completed',
    archive: 'archived',
    sort: 'oldest',
    createdAfter: '2026-09-01T00:00:00.000Z',
    createdBefore: '2026-10-01T00:00:00.000Z',
    page: 3,
    limit: 25,
  });
});

check('rejects unbounded and unsupported list query values', () => {
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ page: '0' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ page: '100001' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ limit: '51' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ sort: 'random' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ archive: 'all' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ status: 'RESOLVED' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ search: 'x'.repeat(81) })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ createdAfter: 'not-a-date', createdBefore: '2026-10-01T00:00:00.000Z' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ createdAfter: '2026-10-01T00:00:00.000Z', createdBefore: '2026-09-01T00:00:00.000Z' })));
  assert.throws(() => parseResponderReportListQuery(new URLSearchParams({ createdAfter: '2026-09-01T00:00:00.000Z' })));
});

check('accepts only an explicit archive boolean', () => {
  assert.deepEqual(parseResponderReportArchivePayload({ archived: true }), { archived: true });
  assert.deepEqual(parseResponderReportArchivePayload({ archived: false }), { archived: false });
  assert.throws(() => parseResponderReportArchivePayload({ archived: 'true' }));
  assert.throws(() => parseResponderReportArchivePayload({ archived: true, reportId: 'another-report' }));
});

check('keeps archive reversible, owner scoped, and non-destructive in the report route', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/reports/[id]/route.ts'), 'utf8');
  assert.match(route, /export async function PATCH/);
  assert.match(route, /role !== ['"]ambulance_responder['"]/);
  assert.match(route, /eq\(reports\.responderId, user\.id\)/);
  assert.match(route, /eq\(reports\.status, ['"]SUBMITTED['"]\)/);
  assert.match(route, /archivedAt: .*archived/);
  assert.doesNotMatch(route, /delete\(reports\)/);
  assert.match(route, /userProfile\.role === 'ambulance_responder'[\s\S]*Report not found/);
});

check('executes responder filtering, count, sorting, and pagination in SQL', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/reports/route.ts'), 'utf8');
  assert.match(route, /ilike\(/);
  assert.match(route, /count\(\)/);
  assert.match(route, /\.limit\(responderQuery\.limit\)/);
  assert.match(route, /\.offset\(/);
  assert.match(route, /responderQuery\.sort === ['"]oldest['"]/);
  assert.match(route, /asc\(reports\.id\)[\s\S]*desc\(reports\.id\)/);
  assert.match(route, /isNull\(reports\.archivedAt\)/);
  assert.match(route, /isNotNull\(reports\.archivedAt\)/);
  assert.match(route, /gte\(reports\.createdAt/);
  assert.match(route, /lt\(reports\.createdAt/);
});

check('gates completion and keeps public report projections redacted', () => {
  const listRoute = readFileSync(join(process.cwd(), 'app/api/reports/route.ts'), 'utf8');
  const detailRoute = readFileSync(join(process.cwd(), 'app/api/reports/[id]/route.ts'), 'utf8');
  assert.match(listRoute, /lockedIncident\.status !== 'ARRIVED'/);
  assert.match(listRoute, /patientCareReports: submittedPatientCareReports/);
  assert.doesNotMatch(listRoute, /body\.patientCareReports/);
  assert.match(listRoute, /Residents must use their report-history view/);
  assert.match(detailRoute, /canViewOperationalDetails \? normalizedPatientCare : \[\]/);
  assert.match(detailRoute, /canViewOperationalDetails \? normalizedTripTicket : null/);
  assert.match(detailRoute, /dbDuplicates = isAdmin \? await db/);
});

check('indexes each responder archive in report order', () => {
  const migration = readFileSync(join(process.cwd(), 'drizzle/0024_fancy_cerise.sql'), 'utf8');
  assert.match(migration, /ADD COLUMN "archived_at" timestamp/);
  assert.match(migration, /reports_responder_archive_created_idx/);
  assert.match(migration, /"responder_id","archived_at","created_at"/);
});

check('restricts direct report mutations and preserves clinical fields', () => {
  const migration = readFileSync(join(process.cwd(), 'drizzle/0025_responder_report_security_and_pcr_fields.sql'), 'utf8');
  assert.match(migration, /ADD COLUMN "pain_assessment" jsonb/);
  assert.match(migration, /ADD COLUMN "gcs_points" integer/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.reports FROM authenticated/);
  assert.match(migration, /responder_id = auth\.uid\(\)::text/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.patient_care_reports FROM authenticated/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.driver_trip_tickets FROM authenticated/);
});

check('uses a bounded responder list with visible controls and protected archive mutations', () => {
  const screen = readFileSync(join(process.cwd(), 'mobile/app/(tabs)/reports/index.tsx'), 'utf8');
  assert.match(screen, /RESPONDER_PAGE_SIZE = 15/);
  assert.match(screen, /<FlatList/);
  assert.match(screen, /Search report ID, type, or barangay/);
  assert.match(screen, /'active', 'archived'/);
  assert.match(screen, /'all', 'completed', 'ongoing'/);
  assert.match(screen, /Newest first/);
  assert.match(screen, /Last 7 days/);
  assert.match(screen, /createdAfter/);
  assert.match(screen, /method: 'PATCH'/);
  assert.match(screen, /archiveUpdatingId/);
  assert.match(screen, /AbortController/);
});

console.log('All responder report management checks passed.');
