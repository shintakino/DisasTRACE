import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INCIDENT_PRESENTATION, formatDurationMinutes } from '../lib/incident-presentation';
import { RESPONDER_ASSIGNMENT_BARANGAYS } from '../lib/responder-assignment-barangays';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

assert.deepEqual(INCIDENT_PRESENTATION.map((item) => item.color), ['#203F91', '#2F6FED', '#7C3AED', '#E52421', '#119C91', '#64748B', '#E2E5EC', '#E2E5EC']);
assert.equal(formatDurationMinutes(752), '12h 32m');
assert.equal(formatDurationMinutes(0), '—');

const dashboardKpis = source('app/api/dashboard/kpis/route.ts');
const analytics = source('app/api/analytics/route.ts');
assert.match(dashboardKpis, /fieldResponseCompletedAt/);
assert.doesNotMatch(dashboardKpis, /historicalAvgResponse/);
assert.match(analytics, /fieldResponseCompletedAt/);
assert.match(analytics, /completedFieldResponses/);

const analyticsDashboard = source('components/analytics/analytics-dashboard.tsx');
assert.match(analyticsDashboard, /<Cell key=\{frequency\.type\} fill=\{frequency\.color\}/);
assert.match(analyticsDashboard, /data\.summary\.completedFieldResponses > 0/);

const mapOverlays = source('components/map/command-map-overlays.tsx');
assert.ok(mapOverlays.indexOf('Historical Demand Outlook') < mapOverlays.indexOf('Map Legend'));
assert.doesNotMatch(mapOverlays, /bottom-4/);

const rosterFilter = source('components/roster/roster-filter.tsx');
assert.match(rosterFilter, />All<\/SelectItem>/);
assert.match(rosterFilter, />Active<\/SelectItem>/);
assert.doesNotMatch(rosterFilter, />ALL<\/SelectItem>/);

const rosterTable = source('components/roster/roster-table.tsx');
assert.match(rosterTable, /const hasMultiplePages = table\.getPageCount\(\) > 1/);
assert.match(rosterTable, /\{hasMultiplePages \?/);
assert.doesNotMatch(rosterTable, /getPageCount\(\) \|\| 10/);

const passwordInput = source('components/ui/password-input.tsx');
const globalStyles = source('app/globals.css');
assert.match(passwordInput, /password-reveal-input/);
assert.match(globalStyles, /\.password-reveal-input::\-ms\-reveal/);

const operations = source('components/dashboard/cdrrmo-operations-dashboard.tsx');
assert.match(operations, /xl:grid-cols-\[minmax\(0,\.85fr\)_minmax\(0,1\.35fr\)\]/);
assert.match(source('app/(dashboard)/layout.tsx'), /if \(path === '\/map'\) return 'Map';/);

const mapPage = source('app/(dashboard)/map/page.tsx');
const mapPanel = source('components/map/incident-panel.tsx');
const mapApi = source('app/api/map/incidents/route.ts');
assert.doesNotMatch(mapPage, /Live Operations Map/);
assert.match(mapPanel, /All Barangays/);
assert.match(mapPanel, /Today<\/SelectItem>/);
assert.match(mapPanel, /Weekly<\/SelectItem>/);
assert.match(mapPanel, /Monthly<\/SelectItem>/);
assert.match(mapPanel, /Yearly<\/SelectItem>/);
assert.match(mapPanel, /<SummaryCard label="ALL"/);
assert.match(mapPanel, /<SummaryCard label="ACTIVE"/);
assert.match(mapPanel, /<SummaryCard label="RESOLVED"/);
assert.match(mapPanel, /<SummaryCard label="REJECTED"/);
assert.match(mapApi, /manilaOperationalPeriodBounds/);
assert.match(mapPage, /filter !== "REJECTED"/);
assert.match(mapPage, /rejected: true/);

const rosterPage = source('app/(dashboard)/roster/page.tsx');
const usersApi = source('app/api/users/route.ts');
assert.equal(RESPONDER_ASSIGNMENT_BARANGAYS.length, 23);
assert.ok(RESPONDER_ASSIGNMENT_BARANGAYS.includes('Calantipay'));
assert.ok(RESPONDER_ASSIGNMENT_BARANGAYS.includes('Matang Tubig'));
assert.ok(RESPONDER_ASSIGNMENT_BARANGAYS.includes('Tilapayong'));
assert.match(rosterPage, /RESPONDER_ASSIGNMENT_BARANGAYS/);
assert.match(usersApi, /isResponderAssignmentBarangay\(barangay\)/);

for (const file of ['components/users/users-table.tsx', 'components/roster/roster-table.tsx', 'components/audit/audit-table.tsx', 'components/logs/logs-table.tsx']) {
  assert.match(source(file), /TableHead[\s\S]{0,200}text-\[15px\]/);
}

const auditPage = source('app/(dashboard)/audit/page.tsx');
assert.match(auditPage, /initialRequestStartedRef/);
assert.match(auditPage, /isInitialLoad = !initialRequestStartedRef\.current/);

console.log('Super Admin metric, palette, map, roster, report, audit, password, and layout checks passed.');
