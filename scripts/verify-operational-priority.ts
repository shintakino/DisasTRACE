import assert from 'node:assert/strict';
import { compareOperationalIncidents, isOperationalIncidentActive, selectOperationalPriority } from '../lib/incident-display-priority';

const incidents = [
  { id: 'closed-critical', severity: 'Critical', status: 'RESOLVED', createdAt: '2026-09-16T10:00:00Z' },
  { id: 'new-low', severity: 'Low', status: 'PENDING', createdAt: '2026-09-16T12:00:00Z' },
  { id: 'old-critical', severity: 'Critical', status: 'VERIFIED', createdAt: '2026-09-16T09:00:00Z' },
  { id: 'new-critical', severity: 'Critical', status: 'PENDING', createdAt: '2026-09-16T11:00:00Z' },
].sort(compareOperationalIncidents);

assert.deepEqual(incidents.map(({ id }) => id), ['new-critical', 'old-critical', 'new-low', 'closed-critical']);
assert.equal(selectOperationalPriority(incidents)?.id, 'new-critical');
assert.equal(isOperationalIncidentActive({ status: 'REJECTED' }), false);
assert.equal(isOperationalIncidentActive({ status: 'COMPLETED' }), false);
assert.equal(isOperationalIncidentActive({ status: 'ONGOING' }), true);
assert.equal(
  [{ id: 'b', severity: 'Medium', status: 'PENDING', createdAt: 'invalid' }, { id: 'a', severity: 'Medium', status: 'PENDING', createdAt: 'invalid' }]
    .sort(compareOperationalIncidents)[0].id,
  'a',
);

console.log('Operational incident priority checks passed.');
