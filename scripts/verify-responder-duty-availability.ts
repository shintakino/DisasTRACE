import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canActivateResponderDuty, RESPONDER_HEARTBEAT_FRESHNESS_MS } from '../lib/dispatch-policy';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const now = new Date('2026-09-25T12:00:00.000Z');

check('requires a fresh trusted heartbeat before a responder becomes on duty', () => {
  assert.equal(canActivateResponderDuty(null, now), false);
  assert.equal(canActivateResponderDuty(new Date(now.getTime() - RESPONDER_HEARTBEAT_FRESHNESS_MS - 1), now), false);
  assert.equal(canActivateResponderDuty(new Date(now.getTime() - RESPONDER_HEARTBEAT_FRESHNESS_MS), now), true);
  assert.equal(canActivateResponderDuty(now, now), true);
});

check('syncs GPS before the mobile app requests On Duty status', () => {
  const profile = readFileSync(join(process.cwd(), 'mobile/app/(tabs)/profile.tsx'), 'utf8');
  const gpsSync = profile.indexOf('const sync = await syncResponderAvailabilityLocation()');
  const dutyRequest = profile.indexOf("fetch(`${apiUrl}/api/users/duty-status`");
  assert.ok(gpsSync >= 0);
  assert.ok(dutyRequest >= 0);
  assert.ok(gpsSync < dutyRequest);
});

check('enforces the GPS handshake at the API boundary', () => {
  const route = readFileSync(join(process.cwd(), 'app/api/users/duty-status/route.ts'), 'utf8');
  assert.match(route, /canActivateResponderDuty\(dbUser\.lastLocationUpdatedAt\)/);
  assert.match(route, /LOCATION_HEARTBEAT_REQUIRED/);
  assert.match(route, /gte\(users\.lastLocationUpdatedAt, heartbeatFreshAfter\)/);
});

check('does not claim On Duty status after a GPS-sync failure', () => {
  const availability = readFileSync(join(process.cwd(), 'mobile/lib/responder-availability.ts'), 'utf8');
  assert.match(availability, /You are still Off Duty/);
  assert.doesNotMatch(availability, /Your on-duty status was saved/);
});

console.log('All responder duty availability checks passed.');
