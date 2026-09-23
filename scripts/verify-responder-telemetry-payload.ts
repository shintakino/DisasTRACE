import assert from 'node:assert/strict';
import {
  normalizeResponderLocationPayload,
  responderLocationStatusPayload,
} from '../mobile/lib/responder-location-status';
import { readFileSync } from 'node:fs';

assert.deepEqual(responderLocationStatusPayload('idle'), {});
assert.deepEqual(responderLocationStatusPayload('dispatch_offered'), {});
assert.deepEqual(responderLocationStatusPayload('en_route'), { responderStatus: 'en_route' });
assert.deepEqual(responderLocationStatusPayload('to_hospital'), { responderStatus: 'to_hospital' });
assert.deepEqual(
  normalizeResponderLocationPayload({ latitude: 14.95, longitude: 120.9, responderStatus: 'idle' }),
  { latitude: 14.95, longitude: 120.9 },
);

const tracker = readFileSync('mobile/hooks/use-broadcast-tracker.ts', 'utf8');
const offlineReplay = readFileSync('mobile/hooks/use-offline-reports.ts', 'utf8');
const responderHome = readFileSync('mobile/components/responder/ResponderHome.tsx', 'utf8');
assert.match(tracker, /responderLocationStatusPayload\(statusRef\.current\)/);
assert.match(tracker, /lastQueueError: null/);
assert.match(offlineReplay, /normalizeResponderLocationPayload\(action\.payload\)/);
assert.match(offlineReplay, /Successfully replayed action/);
assert.match(responderHome, /dutyStatus === 'ON_DUTY' && status === 'idle' && drafts\.length > 0/);

console.log('Responder telemetry payload policy verified.');
