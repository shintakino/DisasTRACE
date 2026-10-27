import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const startRoute = 'app/api/incidents/transport/start/route.ts';

assert.equal(
  existsSync(startRoute),
  true,
  'transport must have a dedicated server-confirmed start endpoint rather than waiting for telemetry',
);

const route = read(startRoute);
const store = read('mobile/stores/useResponderStore.ts');
const onSceneSheet = read('mobile/components/responder/OnSceneSheet.tsx');
const home = read('mobile/components/responder/ResponderHome.tsx');

assert.match(route, /transportStatus: 'TO_HOSPITAL'/);
assert.match(route, /transportHospitalId: hospital\.id/);
assert.match(route, /transportStartedAt:/);
assert.match(route, /eq\(incidents\.responderId, auth\.responder\.id\)/);
assert.match(route, /transportStatus === 'TO_HOSPITAL'[\s\S]*transportHospitalId === input\.data\.hospitalId/);

assert.match(store, /isStartingHospitalTransport: boolean/);
assert.match(store, /startHospitalTransport: \(\) => Promise<boolean>/);
assert.match(store, /\/api\/incidents\/transport\/start/);
assert.match(store, /status: 'to_hospital'/);
assert.match(store, /isStartingHospitalTransport: false/);

assert.match(onSceneSheet, /startHospitalTransport/);
assert.match(onSceneSheet, /void startHospitalTransport\(\)/);
assert.doesNotMatch(onSceneSheet, /useResponderStore\.getState\(\)\.transportToHospital\(\)/);

const recovery = read('mobile/lib/responder-recovery.ts');
assert.match(recovery, /rank\[current\.status\] > rank\[restored\]/);
assert.match(recovery, /transportHospitalId: incoming\.transportHospitalId/);
assert.match(home, /activeDispatch\.transportHospitalId/);

console.log('Responder transport-start workflow checks passed.');
