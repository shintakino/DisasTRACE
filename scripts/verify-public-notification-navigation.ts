import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolvePublicNotificationRoute } from '../mobile/lib/public-notification-route';

const root = process.cwd();
const notificationScreen = fs.readFileSync(path.join(root, 'mobile/app/notifications.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(root, 'mobile/app/_layout.tsx'), 'utf8');

assert.deepEqual(
  resolvePublicNotificationRoute({
    type: 'ambulance_dispatched',
    metadata: { requestId: 'request-1', incidentId: 'incident-1' },
  }),
  {
    pathname: '/help/tracking',
    details: { id: 'request-1', trackingRequestId: 'request-1', incidentId: 'incident-1', reporterMode: 'resident' },
  },
  'A complete public dispatch notification must hydrate tracking with the request and incident IDs.',
);

assert.deepEqual(
  resolvePublicNotificationRoute({ type: 'ambulance_dispatched', metadata: { incidentId: 'incident-1' } }),
  { pathname: '/(tabs)' },
  'Incomplete dispatch metadata must return the public user Home instead of opening a broken tracker.',
);

assert.deepEqual(
  resolvePublicNotificationRoute({ type: 'responder_arrived', metadata: { trackingRequestId: 'request-2', incidentId: 'incident-2' } }),
  {
    pathname: '/help/response-status',
    details: { id: 'request-2', trackingRequestId: 'request-2', incidentId: 'incident-2', reporterMode: 'resident' },
  },
  'Scene-arrival notifications must route to the public completion status, not hospital tracking.',
);

assert.deepEqual(
  resolvePublicNotificationRoute({ type: 'incident_resolved', metadata: { incidentId: 'incident-3', requestId: 'request-3' } }),
  { pathname: '/(tabs)/reports/request-3' },
  'Resolved notifications must open the owned report using its request ID, not its incident ID.',
);

assert.deepEqual(
  resolvePublicNotificationRoute({ type: 'incident_resolved', metadata: { incidentId: 'incident-3' } }),
  { pathname: '/(tabs)/reports' },
  'Missing request metadata must use the safe report-list fallback.',
);

assert.match(notificationScreen, /resolvePublicNotificationRoute/, 'Public notification navigation must use the typed resolver.');
assert.match(notificationScreen, /router\.replace\('\/\(tabs\)' as any\)/, 'Notification back must always return to the stable tab root.');
assert.doesNotMatch(notificationScreen, /router\.push\(`\/\(tabs\)\/reports\/\$\{incidentId\}`/, 'Notification navigation must not construct report routes from incident IDs.');
assert.match(rootLayout, /resolvePublicNotificationRoute/, 'Native Public User notification responses must use the same safe resolver.');
assert.match(rootLayout, /route\?\.pathname \?\? '\/notifications'/, 'Unknown native Public User notification payloads must open Notifications safely.');
assert.match(rootLayout, /Notifications\.getLastNotificationResponseAsync\(\)[\s\S]*Notifications\.clearLastNotificationResponseAsync/, 'The persisted native response must be cleared after it is copied into memory.');

console.log('Public notification navigation regression checks passed.');
