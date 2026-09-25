import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePublicReportHistoryQuery } from '../lib/public-report-history';

const source = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

assert.deepEqual(
  parsePublicReportHistoryQuery(new URLSearchParams({
    type: 'Medical Emergency',
    barangay: 'Poblacion',
    dateRange: 'last_7_days',
  })),
  { type: 'Medical Emergency', barangay: 'Poblacion', dateRange: 'last_7_days' },
);
assert.throws(
  () => parsePublicReportHistoryQuery(new URLSearchParams({ barangay: 'Outside Baliwag' })),
  /official City of Baliwag barangay/,
);

const mapPage = source('app/(dashboard)/map/page.tsx');
const mapPanel = source('components/map/incident-panel.tsx');
const mapApi = source('app/api/map/incidents/route.ts');
const mapHook = source('hooks/use-map-data.ts');

assert.match(mapPage, /const \[barangay, setBarangay\] = useState\("all"\)/);
assert.match(mapPage, /const \[selectedDate, setSelectedDate\] = useState<string \| undefined>\(undefined\)/);
assert.match(mapPanel, /Calendar/);
assert.match(mapPanel, /onBarangayChange/);
assert.match(mapPanel, /onDateChange/);
assert.match(mapPanel, /onTogglePanel/);
assert.match(mapPanel, /PanelLeftClose/);
assert.match(mapPage, /\{!isSidebarOpen \? \(/);
assert.match(mapApi, /MapBarangaySchema/);
assert.match(mapHook, /params\.set\('barangay', barangay\)/);

const rosterSearch = source('components/roster/roster-search.tsx');
const rosterFilter = source('components/roster/roster-filter.tsx');
assert.match(rosterSearch, /bg-white\/10/);
assert.match(rosterFilter, /bg-white\/10/);

const dashboard = source('app/(dashboard)/dashboard/page.tsx');
const dashboardTypes = source('types/dashboard.ts');
const operations = source('components/dashboard/cdrrmo-operations-dashboard.tsx');
const auditPreview = source('components/dashboard/cdrrmo-audit-preview.tsx');
const auditRoute = source('app/api/audit/route.ts');
assert.match(dashboard, /fetch\('\/api\/audit\?limit=7'\)/);
assert.match(dashboardTypes, /AuditPreviewSchema/);
assert.match(operations, /CDRRMOAuditPreview/);
assert.match(operations, /grid gap-5 lg:grid-cols-\[minmax\(0,3fr\)_minmax\(0,3fr\)_minmax\(0,4fr\)\]/);
assert.match(auditPreview, /Audit Log Preview/);
assert.match(auditRoute, /actorName: log\.actorName/);
assert.match(auditRoute, /entityType: log\.entityType/);

const reportsApi = source('app/api/reports/route.ts');
const publicQuery = source('lib/public-report-history.ts');
const mobileReports = source('mobile/app/(tabs)/reports/index.tsx');
assert.match(reportsApi, /parsePublicReportHistoryQuery/);
assert.match(reportsApi, /publicQuery\.barangay/);
assert.match(reportsApi, /publicQuery\.dateRange/);
assert.match(publicQuery, /PublicReportHistoryQuerySchema/);
assert.match(mobileReports, /params\.set\('dateRange', dateFilter\)/);
assert.match(mobileReports, /residentControls/);
assert.match(mobileReports, /Date/);
assert.match(mobileReports, /Incident type/);
assert.match(mobileReports, /Barangay/);

console.log('Map filters, roster styling, audit preview, and report-history filter checks passed.');
