import assert from 'node:assert/strict';
import { shouldAutomaticallyMarkArrived } from '../lib/arrival-geofence';

const createdAt = new Date('2026-09-15T00:00:00.000Z');
const sample = (latitude: number, accuracy = 10, seconds = 10) => ({
  latitude,
  longitude: 120.901,
  accuracy,
  observedAt: new Date(createdAt.getTime() + seconds * 1000),
});
const base = { incidentLatitude: 14.951, incidentLongitude: 120.901, incidentCreatedAt: createdAt };

assert.equal(shouldAutomaticallyMarkArrived({ ...base, previous: sample(14.9511, 10, 5), current: sample(14.95105, 10, 10) }), true);
assert.equal(shouldAutomaticallyMarkArrived({ ...base, previous: sample(14.9511, 80, 5), current: sample(14.95105, 10, 10) }), false);
assert.equal(shouldAutomaticallyMarkArrived({ ...base, previous: sample(14.952, 10, 5), current: sample(14.95105, 10, 10) }), false);
assert.equal(shouldAutomaticallyMarkArrived({ ...base, previous: sample(14.9511, 10, 5), current: sample(14.95105, 10, 40) }), false);

console.log('Arrival geofence checks passed.');
