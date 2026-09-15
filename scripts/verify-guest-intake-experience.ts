import assert from 'node:assert/strict';
import {
  deriveGuestReportAllowance,
  mergeBoundedGuestHistoryIds,
  mergeBoundedGuestMessages,
  normalizeGuestPhoneInput,
  reporterHomeRoute,
  validateGuestDraftForSubmission,
} from '../mobile/lib/guest-intake-experience';
import { RequestTimeoutError, fetchWithTimeout } from '../mobile/lib/fetch-timeout';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('guest phone input is canonical, numeric, and limited to eleven digits', () => {
  assert.equal(normalizeGuestPhoneInput('09ab17-123-456789'), '09171234567');
  assert.equal(normalizeGuestPhoneInput('+63 917 123 4567'), '09171234567');
  assert.equal(normalizeGuestPhoneInput('9171234567'), '09171234567');
});

check('submission validation names missing required fields', () => {
  const result = validateGuestDraftForSubmission({ contactNumber: '09171234567' }, 'guest');
  assert.equal(result.valid, false);
  assert.deepEqual(result.missingFields, [
    'Photo evidence',
    'Incident type',
    'GPS location',
    'Nearby landmark',
    'People involved',
    'Victim condition',
  ]);
});

check('a complete guest submission passes validation', () => {
  const result = validateGuestDraftForSubmission({
    photoUri: 'file://evidence.jpg',
    incidentType: 'Medical Emergency',
    nature: 'EMERGENCY',
    contactNumber: '09171234567',
    landmarks: 'Baliwag City Hall',
    latitude: 14.95,
    longitude: 120.9,
    peopleInvolved: 1,
    victimCondition: 'Conscious and stable',
  }, 'guest');
  assert.equal(result.valid, true);
  assert.deepEqual(result.missingFields, []);
});

check('guest completion returns to the unauthenticated landing screen', () => {
  assert.equal(reporterHomeRoute('guest'), '/');
  assert.equal(reporterHomeRoute('registered'), '/(tabs)');
});

check('remaining guest reports use the tighter phone or device allowance', () => {
  assert.deepEqual(deriveGuestReportAllowance(3, 1, 2), { limit: 3, used: 2, remaining: 1 });
  assert.deepEqual(deriveGuestReportAllowance(3, 3, 1), { limit: 3, used: 3, remaining: 0 });
});

check('guest history keeps the newest bounded unique report IDs', () => {
  assert.deepEqual(mergeBoundedGuestHistoryIds(['old', 'newer'], 'latest', 2), ['latest', 'old']);
  assert.deepEqual(mergeBoundedGuestHistoryIds(['same', 'older'], 'same', 3), ['same', 'older']);
});

check('guest transcript history deduplicates and bounds messages', () => {
  const first = { id: '1', role: 'bot' as const, text: 'One' };
  const second = { id: '2', role: 'user' as const, text: 'Two' };
  const third = { id: '3', role: 'bot' as const, text: 'Three' };
  assert.deepEqual(mergeBoundedGuestMessages([first, second], [second, third], 2), [second, third]);
});

async function verifyTimeout() {
  const stalledFetch = () => new Promise<Response>(() => undefined);
  await assert.rejects(
    fetchWithTimeout('https://example.test', {}, 5, 'report submission', stalledFetch),
    (error: unknown) => error instanceof RequestTimeoutError
      && error.message === 'Report submission timed out. Your draft was kept. Please check your connection and try again.',
  );
  console.log('PASS stalled report submission has a bounded retryable timeout');
}

verifyTimeout()
  .then(() => console.log('All guest intake experience checks passed.'))
  .catch((error) => { throw error; });
