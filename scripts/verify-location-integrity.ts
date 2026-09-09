import assert from 'node:assert/strict';
import { assessResponderLocationMovement, distanceBetweenCoordinatesMeters } from '../lib/location-integrity';

const now = new Date('2026-09-09T00:00:10.000Z');
const recent = new Date('2026-09-09T00:00:05.000Z');

assert.equal(
  assessResponderLocationMovement({
    previousLatitude: 14.954,
    previousLongitude: 120.902,
    previousUpdatedAt: recent,
    latitude: 14.955,
    longitude: 120.902,
    observedAt: now,
  }).plausible,
  true,
  'ordinary GPS movement must remain accepted',
);

assert.equal(
  assessResponderLocationMovement({
    previousLatitude: 14.954,
    previousLongitude: 120.902,
    previousUpdatedAt: recent,
    latitude: 14.954,
    longitude: 121.002,
    observedAt: now,
  }).plausible,
  false,
  'a rapid multi-kilometre jump must be held',
);

assert.equal(
  assessResponderLocationMovement({
    previousLatitude: 14.954,
    previousLongitude: 120.902,
    previousUpdatedAt: new Date('2026-09-08T23:30:00.000Z'),
    latitude: 14.954,
    longitude: 121.002,
    observedAt: now,
  }).plausible,
  true,
  'a stale heartbeat must not prevent a responder reconnecting from a new location',
);

assert.ok(distanceBetweenCoordinatesMeters(14.954, 120.902, 14.955, 120.902) > 100);
console.log('Location integrity checks passed.');
