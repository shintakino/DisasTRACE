import assert from 'node:assert/strict';
import { getPublicHomeNavigationPlan } from '../mobile/lib/public-home-navigation';

function check(name: string, callback: () => void) {
  callback();
  console.log(`PASS ${name}`);
}

check('Guest Home uses one root replacement while retaining report status', () => {
  assert.deepEqual(getPublicHomeNavigationPlan('guest'), {
    route: '/',
    preservesActiveReport: true,
  });
});

check('Registered Home uses one tab replacement while retaining report status', () => {
  assert.deepEqual(getPublicHomeNavigationPlan('registered'), {
    route: '/(tabs)',
    preservesActiveReport: true,
  });
});

console.log('All public Home navigation checks passed.');
