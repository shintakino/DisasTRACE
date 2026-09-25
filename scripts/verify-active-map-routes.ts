import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MapActiveRouteSchema } from '../types/map';

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), 'utf8');

assert.deepEqual(MapActiveRouteSchema.parse({
  incidentId: 'incident-1',
  responderId: 'responder-1',
  responderLat: 14.95,
  responderLng: 120.91,
  responderLastUpdated: '2026-09-26T00:00:00.000Z',
  incidentLat: 14.96,
  incidentLng: 120.92,
  severity: 'Critical',
}), {
  incidentId: 'incident-1',
  responderId: 'responder-1',
  responderLat: 14.95,
  responderLng: 120.91,
  responderLastUpdated: '2026-09-26T00:00:00.000Z',
  incidentLat: 14.96,
  incidentLng: 120.92,
  severity: 'Critical',
});

const routeApi = source('app/api/map/routes/route.ts');
assert.match(routeApi, /await isAdmin\(\)/);
assert.match(routeApi, /inArray\(incidents\.status, ACTIVE_ROUTE_STATUSES\)/);
assert.match(routeApi, /innerJoin\(users, eq\(incidents\.responderId, users\.id\)\)/);
assert.match(routeApi, /innerJoin\(verificationRequests, eq\(incidents\.requestId, verificationRequests\.id\)\)/);
assert.match(routeApi, /MapActiveRouteSchema/);

const mapData = source('hooks/use-map-data.ts');
assert.match(mapData, /fetch\("\/api\/map\/routes"\)/);
assert.match(mapData, /setActiveRoutes\(activeRoutesData\)/);
assert.match(mapData, /route\.incidentId === incidentId/);

const mapPage = source('app/(dashboard)/map/page.tsx');
assert.match(mapPage, /activeRoutes=\{activeRoutes\}/);

const mapContainer = source('components/map/map-container.tsx');
assert.match(mapContainer, /function fallbackRoute/);
assert.match(mapContainer, /route\.isFallback \? \{ "line-dasharray": \[2, 2\] \} : \{\}/);
assert.match(mapContainer, /if \(!response\.ok\)/);
assert.match(mapContainer, /activeRoutes\.map/);
assert.doesNotMatch(mapContainer, /const dispatchedPairs/);

console.log('Active command-map route contract checks passed.');
