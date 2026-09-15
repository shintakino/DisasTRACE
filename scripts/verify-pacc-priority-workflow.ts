import assert from 'node:assert/strict';
import { deriveAuthoritativeInitialTriage } from '../lib/initial-triage-policy';
import { compareActiveVerificationItems, isNewVerificationItem } from '../lib/verification-queue-priority';
import { createCoalescedRefresh } from '../lib/coalesced-refresh';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('routes Unknown Cause to PACC review regardless of the client nature hint', () => {
  assert.deepEqual(deriveAuthoritativeInitialTriage({
    incidentType: 'Unknown Cause',
    requestedNature: 'EMERGENCY',
  }), {
    nature: 'NON-EMERGENCY',
    classification: 'UNCERTAIN_INCOMPLETE',
    reasons: ['The incident cause and appropriate coordinating agency are unknown. PACC review is required.'],
  });
  assert.deepEqual(deriveAuthoritativeInitialTriage({
    incidentType: 'Unknown Cause',
    requestedNature: 'NON-EMERGENCY',
  }), {
    nature: 'NON-EMERGENCY',
    classification: 'UNCERTAIN_INCOMPLETE',
    reasons: ['The incident cause and appropriate coordinating agency are unknown. PACC review is required.'],
  });
});

check('keeps explicit routine categories non-emergency and normal emergencies emergency', () => {
  assert.equal(deriveAuthoritativeInitialTriage({
    incidentType: 'Patient Transport',
    requestedNature: 'EMERGENCY',
  }).classification, 'HIGH_CONFIDENCE_NON_EMERGENCY');
  assert.equal(deriveAuthoritativeInitialTriage({
    incidentType: 'Medical Emergency',
    requestedNature: 'NON-EMERGENCY',
  }).classification, 'HIGH_CONFIDENCE_EMERGENCY');
});

check('orders active PACC work by severity, reassignment, then newest report', () => {
  const requests = [
    { requestId: 'medium-new', severity: 'Medium', requiresPaccReassignment: false, nature: 'EMERGENCY', receivedAt: '2026-09-15T10:04:00.000Z' },
    { requestId: 'critical-old', severity: 'Critical', requiresPaccReassignment: false, nature: 'EMERGENCY', receivedAt: '2026-09-15T10:00:00.000Z' },
    { requestId: 'high-new', severity: 'High', requiresPaccReassignment: false, nature: 'EMERGENCY', receivedAt: '2026-09-15T10:03:00.000Z' },
    { requestId: 'high-reassignment', severity: 'High', requiresPaccReassignment: true, nature: 'EMERGENCY', receivedAt: '2026-09-15T10:01:00.000Z' },
  ].map((request) => ({ ...request, id: request.requestId })).sort(compareActiveVerificationItems);

  assert.deepEqual(requests.map((request) => request.requestId), [
    'critical-old',
    'high-reassignment',
    'high-new',
    'medium-new',
  ]);
});

check('marks only reports received during the two-minute visibility window as new', () => {
  const now = new Date('2026-09-15T10:05:00.000Z');
  assert.equal(isNewVerificationItem('2026-09-15T10:03:01.000Z', now.getTime()), true);
  assert.equal(isNewVerificationItem('2026-09-15T10:03:00.000Z', now.getTime()), true);
  assert.equal(isNewVerificationItem('invalid', now.getTime()), false);
});

async function verifyCoalescedRefresh() {
  let releaseFirst: ((value: string) => void) | undefined;
  let loadCount = 0;
  const applied: string[] = [];
  const refresh = createCoalescedRefresh(async () => {
    loadCount += 1;
    if (loadCount === 1) {
      return new Promise<string>((resolve) => {
        releaseFirst = resolve;
      });
    }
    return 'latest';
  }, (value) => applied.push(value));

  const first = refresh();
  const second = refresh();
  const third = refresh();
  releaseFirst?.('initial');
  await Promise.all([first, second, third]);

  assert.equal(loadCount, 2);
  assert.deepEqual(applied, ['initial', 'latest']);
}

verifyCoalescedRefresh().then(() => {
  console.log('PASS coalesces burst refreshes into one trailing authoritative load');
  console.log('All PACC priority workflow checks passed.');
}).catch((error) => { throw error; });
