import assert from 'node:assert/strict';
import { guestReportAccessTokenKey } from '../mobile/lib/guest-report-history-key';
import { formatResponderDistanceKm } from '../mobile/lib/responder-report-summary';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('uses an Android-safe SecureStore key for guest report refresh credentials', () => {
  const key = guestReportAccessTokenKey('c1f1f264-1234-4a5c-9876-abcdef123456');
  assert.match(key, /^[A-Za-z0-9._-]+$/);
  assert.doesNotMatch(key, /:/);
});

check('renders an unavailable responder-trip distance without throwing', () => {
  assert.equal(formatResponderDistanceKm(undefined), '—');
  assert.equal(formatResponderDistanceKm(Number.NaN), '—');
  assert.equal(formatResponderDistanceKm(1.234), '1.2');
});

console.log('All mobile reliability checks passed.');
