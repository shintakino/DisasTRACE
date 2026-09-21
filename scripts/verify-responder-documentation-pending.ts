import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const schema = read('db/schema/incidents.ts');
assert.match(schema, /'DOCUMENTATION_PENDING'/);
assert.match(schema, /fieldOutcome/);
assert.match(schema, /fieldResponseCompletedAt/);

const migration = read('drizzle/0030_responder_documentation_pending.sql');
assert.match(migration, /DOCUMENTATION_PENDING/);
assert.match(migration, /HANDLED_ON_SCENE/);
assert.match(migration, /HOSPITAL_ARRIVAL/);

const incidentStatusRoute = read('app/api/incidents/status/route.ts');
assert.match(incidentStatusRoute, /status: z\.enum\(\['ARRIVED', 'DOCUMENTATION_PENDING'\]\)/);
assert.match(incidentStatusRoute, /\.for\('update'\)/);
assert.match(incidentStatusRoute, /fieldOutcome === 'HOSPITAL_ARRIVAL'/);
assert.match(incidentStatusRoute, /transportStatus !== 'ARRIVED_AT_HOSPITAL'/);
assert.match(incidentStatusRoute, /dutyStatus: 'ON_DUTY'/);
assert.match(incidentStatusRoute, /retryPendingAutomaticDispatches/);
assert.match(incidentStatusRoute, /kind: 'already_deferred'/);
assert.match(incidentStatusRoute, /lockedIncident\.fieldOutcome === fieldOutcome/);

const reportsRoute = read('app/api/reports/route.ts');
assert.match(reportsRoute, /\['ARRIVED', 'DOCUMENTATION_PENDING'\]\.includes\(lockedIncident\.status\)/);

const store = read('mobile/stores/useResponderStore.ts');
assert.match(store, /deferDocumentation: async/);
assert.match(store, /status: 'DOCUMENTATION_PENDING'/);
assert.match(store, /activeDispatch: null/);
assert.match(store, /fieldOutcome: null/);
assert.match(store, /queueDocumentationRelease/);
assert.match(store, /fetchWithTimeout\([^\n]+\/api\/incidents\/status/);
assert.match(store, /documentationReleaseIndex/);

const offlineReports = read('mobile/hooks/use-offline-reports.ts');
assert.match(offlineReports, /fetchWithTimeout\([^\n]+action\.endpoint/);
assert.match(offlineReports, /action\.payload\.status === 'DOCUMENTATION_PENDING'/);
assert.match(offlineReports, /Field response synced/);

const onSceneSheet = read('mobile/components/responder/OnSceneSheet.tsx');
assert.match(onSceneSheet, /Save Draft &amp; Become Available/);
assert.match(onSceneSheet, /void deferDocumentation/);
assert.doesNotMatch(onSceneSheet, /setStatus\('idle'\)/);

const hospitalSheet = read('mobile/components/responder/HospitalDocumentationSheet.tsx');
assert.match(hospitalSheet, /Save Draft &amp; Become Available/);
assert.match(hospitalSheet, /void deferDocumentation/);

const incidentReportForm = read('mobile/components/responder/IncidentReportForm.tsx');
assert.match(incidentReportForm, /Save Draft &amp; Become Available/);
assert.match(incidentReportForm, /void deferDocumentation/);

const selector = read('mobile/components/responder/SelectIncidentModal.tsx');
assert.match(selector, /\.eq\('status', 'DOCUMENTATION_PENDING'\)/);

console.log('Responder documentation-pending workflow checks passed.');
