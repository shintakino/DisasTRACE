import assert from 'node:assert/strict';
import {
  INCIDENT_DEDUPLICATION_RADIUS_METERS,
  distanceBetweenMeters,
  isLikelyDuplicateIncident,
} from '../lib/incident-deduplication';

const source = { type: 'Medical Emergency', latitude: 14.952, longitude: 120.899 };
const nearbySameType = { type: 'Medical Emergency', latitude: 14.953, longitude: 120.899 };
const nearbyDifferentType = { type: 'Fire Emergency', latitude: 14.953, longitude: 120.899 };
const distantSameType = { type: 'Medical Emergency', latitude: 14.957, longitude: 120.899 };

assert.ok(INCIDENT_DEDUPLICATION_RADIUS_METERS >= 50 && INCIDENT_DEDUPLICATION_RADIUS_METERS <= 1_000);
assert.ok(distanceBetweenMeters(source.latitude, source.longitude, nearbySameType.latitude, nearbySameType.longitude) < INCIDENT_DEDUPLICATION_RADIUS_METERS);
assert.equal(isLikelyDuplicateIncident(source, nearbySameType), true);
assert.equal(isLikelyDuplicateIncident(source, nearbyDifferentType), false);
assert.equal(isLikelyDuplicateIncident(source, distantSameType), false);

console.log('All incident deduplication checks passed.');
