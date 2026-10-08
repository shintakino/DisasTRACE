import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isFreshOperationalLocation } from '../mobile/lib/location-integrity';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('responder map releases camera control for a user gesture', () => {
  const home = source('mobile/components/responder/ResponderHome.tsx');
  assert.match(home, /event\.nativeEvent\.userInteraction/);
  assert.doesNotMatch(home, /properties\?\.isUserGesture/);
});

check('hospital confirmation is a distinct durable action', () => {
  const store = source('mobile/stores/useResponderStore.ts');
  assert.match(store, /HOSPITAL_ARRIVAL_CONFIRMATION/);
  assert.match(store, /isHospitalArrivalPendingSync/);
  assert.match(store, /Hospital arrival is pending sync with PACC\. You remain assigned/);
  assert.match(store, /type: 'HOSPITAL_ARRIVAL_CONFIRMATION'/);
  assert.match(store, /hospitalArrivalConfirmationIndex/);
});

check('hospital confirmation replay gates the local completion state on API success', () => {
  const offline = source('mobile/hooks/use-offline-reports.ts');
  assert.match(offline, /action\.type === 'HOSPITAL_ARRIVAL_CONFIRMATION'/);
  assert.match(offline, /hospital arrival confirmation/);
  assert.match(offline, /status: 'at_hospital'/);
  assert.match(offline, /isHospitalArrivalPendingSync: false/);
});

check('approved responder sessions hydrate owned offline actions after restart', () => {
  const layout = source('mobile/app/_layout.tsx');
  assert.match(layout, /const loadOfflineQueue = useResponderStore/);
  assert.match(layout, /void loadOfflineQueue\(\)/);
});

check('completion status is projected from the server result', () => {
  const reportsRoute = source('app/api/reports/route.ts');
  const store = source('mobile/stores/useResponderStore.ts');
  const offline = source('mobile/hooks/use-offline-reports.ts');
  assert.match(reportsRoute, /dutyStatus: otherActiveIncident \? 'ACTIVE_DISPATCH'/);
  assert.match(reportsRoute, /dutyStatus: completion\.dutyStatus/);
  assert.match(store, /useResponderDutyStore\.getState\(\)\.setDutyStatus\(res\.dutyStatus\)/);
  assert.match(offline, /setDutyStatus\(result\?\.dutyStatus\)/);
});

check('only recent cached GPS readings may be used operationally', () => {
  const now = 1_000_000;
  assert.equal(isFreshOperationalLocation({ timestamp: now - 59_999 }, 60_000, now), true);
  assert.equal(isFreshOperationalLocation({ timestamp: now - 60_001 }, 60_000, now), false);
  assert.equal(isFreshOperationalLocation({ timestamp: now + 1 }, 60_000, now), false);

  const tracker = source('mobile/hooks/use-broadcast-tracker.ts');
  const intake = source('mobile/app/help/form.tsx');
  assert.match(tracker, /isFreshOperationalLocation\(lastLoc\)/);
  assert.match(intake, /isFreshOperationalLocation\(lastLoc\)/);
});

console.log('Responder reporting reliability checks passed.');
