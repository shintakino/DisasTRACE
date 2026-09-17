import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { guestAllowanceCopy } from '../mobile/lib/guest-report-allowance';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

assert.deepEqual(guestAllowanceCopy(2), {
  headline: '2 guest reports remaining',
  reminder: 'Register before your Guest Mode allowance runs out.',
  exhausted: false,
});
assert.deepEqual(guestAllowanceCopy(1), {
  headline: '1 guest report remaining',
  reminder: 'Only one Guest Mode report remains. Register now to avoid losing access during a future emergency.',
  exhausted: false,
});
assert.deepEqual(guestAllowanceCopy(0), {
  headline: 'No guest reports remaining',
  reminder: 'Your Guest Mode allowance is used up. Register or sign in before submitting another report.',
  exhausted: true,
});

for (const screen of [
  'mobile/app/help/chatbot-pending.tsx',
  'mobile/app/help/response-status.tsx',
  'mobile/app/help/resolution.tsx',
  'mobile/app/help/guest-history.tsx',
]) {
  assert.match(source(screen), /GuestAllowanceBanner/, `${screen} must show the shared guest allowance banner.`);
}

const emergencyStore = source('mobile/store/use-emergency-report-store.ts');
assert.match(emergencyStore, /guestReportsRemaining/);
const bridge = source('mobile/lib/chatbot-report-bridge.ts');
assert.match(bridge, /guestReportsRemaining: activeReport\.reportsRemaining/);

console.log('Guest allowance visibility checks passed.');
