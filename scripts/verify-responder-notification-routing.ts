import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { resolveResponderNotificationRoute } from '../mobile/lib/responder-notification-route';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

assert.deepEqual(
  resolveResponderNotificationRoute({ type: 'report_audited', metadata: { reportId: 'report-1' } }),
  { pathname: '/(tabs)/reports' },
  'Report-audited responder notifications must stay in report history, never Profile.',
);

assert.deepEqual(
  resolveResponderNotificationRoute({ type: 'dispatch_alert', metadata: { incidentId: 'incident-1' } }),
  { pathname: '/(tabs)', params: { dispatchOfferId: 'incident-1' } },
  'In-app dispatch notifications must preserve their incident ID for server-backed hydration.',
);

assert.deepEqual(
  resolveResponderNotificationRoute({ kind: 'dispatch_offer', incidentId: 'incident-2' }),
  { pathname: '/(tabs)', params: { dispatchOfferId: 'incident-2' } },
  'Push dispatch offers must resolve to Home with the exact offer ID.',
);

assert.deepEqual(
  resolveResponderNotificationRoute({ kind: 'dispatch_offer_expired', incidentId: 'incident-3' }),
  { pathname: '/(tabs)' },
  'A delayed expiry push must only open the safe responder Home route.',
);

assert.equal(
  resolveResponderNotificationRoute({ kind: 'unknown_event' }),
  null,
  'Unknown notifications must not invent an app-scheme route.',
);

const dispatchSheet = read('mobile/components/responder/DispatchSheet.tsx');
assert.match(
  dispatchSheet,
  /api\/incidents\/offer\?incidentId=/,
  'The expiry path must reconcile from the server-owned offer endpoint.',
);
assert.doesNotMatch(
  dispatchSheet,
  /action:\s*'REJECT'/,
  'The mobile expiry timer must not race acceptance by posting a competing rejection.',
);

const notificationScreen = read('mobile/app/notifications.tsx');
assert.match(
  notificationScreen,
  /role === 'ambulance_responder'[\s\S]*?resolveResponderNotificationRoute[\s\S]*?router\.replace\(responderRoute as any\)/,
  'Responder notifications must resolve before public-user state is touched.',
);
assert.match(
  notificationScreen,
  /role === 'public_user'[\s\S]*?resolvePublicNotificationRoute[\s\S]*?useEmergencyReportStore\.getState\(\)\.setDetails/,
  'Only the public route resolver may write validated public tracking state.',
);

const rootLayout = read('mobile/app/_layout.tsx');
assert.match(rootLayout, /clearLastNotificationResponseAsync/, 'Handled Android notification taps must be consumed once.');
assert.match(rootLayout, /resolveResponderNotificationRoute/, 'Android responder pushes must use the same internal route resolver.');
assert.match(rootLayout, /role === 'public_user'[\s\S]*?resolvePublicNotificationRoute/, 'Android public notification taps must use the public resolver.');

console.log('Responder notification routing and expiry race regression checks passed.');
