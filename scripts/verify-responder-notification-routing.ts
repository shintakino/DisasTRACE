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
assert.match(
  notificationScreen,
  /role === 'ambulance_responder' && router\.canGoBack\(\)[\s\S]*?router\.back\(\)[\s\S]*?router\.replace\('\/\(tabs\)'/,
  'Notification Back must pop a manually opened screen and only fall back to Home for cold-start notification launches.',
);

const rootLayout = read('mobile/app/_layout.tsx');
assert.match(rootLayout, /clearLastNotificationResponseAsync/, 'Handled Android notification taps must be consumed once.');
assert.match(rootLayout, /resolveResponderNotificationRoute/, 'Android responder pushes must use the same internal route resolver.');
assert.match(rootLayout, /role === 'public_user'[\s\S]*?resolvePublicNotificationRoute/, 'Android public notification taps must use the public resolver.');

const homeScreen = read('mobile/app/(tabs)/index.tsx');
assert.match(
  homeScreen,
  /data:\s*\{ type: notif\.type, metadata: notif\.metadata \}/,
  'Generic local notifications must preserve their typed route payload.',
);
assert.match(
  homeScreen,
  /isResponderDispatchAlert[\s\S]*?return;[\s\S]*?Notifications\.scheduleNotificationAsync/,
  'Responder dispatch alerts must not be duplicated by the generic home notification listener.',
);
assert.match(
  homeScreen,
  /const controller = new AbortController\(\)[\s\S]*?signal: controller\.signal[\s\S]*?catch \(error\)[\s\S]*?controller\.abort\(\)/,
  'Notification offer hydration must cancel on exit and catch failed network/session work.',
);

const tabsLayout = read('mobile/app/(tabs)/_layout.tsx');
assert.match(tabsLayout, /responderStatus !== 'dispatch_offered'/, 'Only a new offer may auto-route a responder to Home.');
assert.doesNotMatch(tabsLayout, /responderStatus === 'dispatch_offered'\s*\|\|\s*responderStatus === 'en_route'/, 'En-route state must not compete with report or notification navigation.');

console.log('Responder notification routing and expiry race regression checks passed.');
