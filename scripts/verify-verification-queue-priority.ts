import assert from 'node:assert/strict';
import {
  compareActiveVerificationItems,
  getVerificationPriorityReason,
  isNewVerificationItem,
  selectHighestPriorityVerificationItem,
} from '../lib/verification-queue-priority';

const base = { receivedAt: '2026-09-15T00:00:00.000Z' };
const sorted = [
  { ...base, id: 'low-new', severity: 'Low', receivedAt: '2026-09-15T00:02:00.000Z' },
  { ...base, id: 'critical-old', severity: 'Critical' },
  { ...base, id: 'high-old', severity: 'High' },
  { ...base, id: 'high-new', severity: 'High', receivedAt: '2026-09-15T00:01:00.000Z' },
].sort(compareActiveVerificationItems);
assert.deepEqual(sorted.map(({ id }) => id), ['critical-old', 'high-new', 'high-old', 'low-new']);
assert.equal(selectHighestPriorityVerificationItem(sorted)?.id, 'critical-old');
assert.equal(selectHighestPriorityVerificationItem([]), null);
assert.equal(
  selectHighestPriorityVerificationItem([
    { id: 'invalid-b', severity: 'Medium', receivedAt: 'not-a-date' },
    { id: 'invalid-a', severity: 'Medium', receivedAt: 'still-not-a-date' },
  ])?.id,
  'invalid-a',
);
assert.equal(
  getVerificationPriorityReason({ id: 'reassign', severity: 'High', receivedAt: base.receivedAt, requiresPaccReassignment: true }),
  'High severity • responder reassignment required',
);
assert.equal(isNewVerificationItem('2026-09-15T00:00:00.000Z', new Date('2026-09-15T00:01:59.000Z').getTime()), true);
assert.equal(isNewVerificationItem('2026-09-15T00:00:00.000Z', new Date('2026-09-15T00:02:01.000Z').getTime()), false);
assert.equal(isNewVerificationItem('not-a-date'), false);
console.log('Verification queue priority checks passed.');
