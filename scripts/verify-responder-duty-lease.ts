import assert from 'node:assert/strict';
import { effectiveResponderDutyStatus } from '../mobile/lib/responder-duty';

const now = Date.parse('2026-11-02T10:00:00.000Z');
assert.equal(effectiveResponderDutyStatus('ON_DUTY', '2026-11-02T09:59:30.000Z', now), 'ON_DUTY');
assert.equal(effectiveResponderDutyStatus('ON_DUTY', '2026-11-02T09:58:00.000Z', now), 'OFF_DUTY');
assert.equal(effectiveResponderDutyStatus('ON_DUTY', null, now), 'OFF_DUTY');
assert.equal(effectiveResponderDutyStatus('OFF_DUTY', '2026-11-02T09:59:59.000Z', now), 'OFF_DUTY');
assert.equal(effectiveResponderDutyStatus('ACTIVE_DISPATCH', null, now), 'ACTIVE_DISPATCH', 'A live field assignment is never cleared by a stale GPS timestamp.');
console.log('PASS responder duty lease: stale availability expires while active assignments remain protected');
