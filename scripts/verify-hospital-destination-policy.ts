import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canEnterHospitalReport,
  canStartHospitalTransport,
  getAutomaticHospitalRecommendation,
  getNearestEligibleHospital,
  isEligibleHospitalDestination,
  rankEligibleHospitals,
} from '../mobile/lib/hospital-destination-policy';

const origin = { latitude: 14.95, longitude: 120.90 };
const hospitals = [
  {
    id: 'far',
    name: 'Far Hospital',
    caters: true,
    coordinates: { latitude: 14.97, longitude: 120.90 },
  },
  {
    id: 'inactive',
    name: 'Inactive Hospital',
    caters: false,
    coordinates: { latitude: 14.9501, longitude: 120.90 },
  },
  {
    id: 'nearest-b',
    name: 'Nearest B',
    caters: true,
    coordinates: { latitude: 14.951, longitude: 120.90 },
  },
  {
    id: 'nearest-a',
    name: 'Nearest A',
    caters: true,
    coordinates: { latitude: 14.951, longitude: 120.90 },
  },
  {
    id: 'bad-coordinates',
    name: 'Bad Coordinates',
    caters: true,
    coordinates: { latitude: Number.NaN, longitude: 120.90 },
  },
];

assert.equal(isEligibleHospitalDestination(hospitals[0]), true);
assert.equal(isEligibleHospitalDestination(hospitals[1]), false);
assert.equal(isEligibleHospitalDestination(hospitals[4]), false);

const ranked = rankEligibleHospitals(hospitals, origin);
assert.deepEqual(ranked.map((hospital) => hospital.id), ['nearest-a', 'nearest-b', 'far']);
assert.equal(getNearestEligibleHospital(hospitals, origin)?.id, 'nearest-a');
assert.equal(getNearestEligibleHospital([hospitals[1], hospitals[4]], origin), null);
assert.equal(getAutomaticHospitalRecommendation({
  status: 'to_hospital',
  currentTarget: null,
  candidates: hospitals,
  origin,
})?.id, 'nearest-a');
assert.equal(getAutomaticHospitalRecommendation({
  status: 'to_hospital',
  currentTarget: hospitals[0],
  candidates: hospitals,
  origin,
}), null, 'an existing responder choice must never be overwritten');
assert.equal(getAutomaticHospitalRecommendation({
  status: 'on_scene',
  currentTarget: null,
  candidates: hospitals,
  origin,
}), null);

assert.equal(canEnterHospitalReport('to_hospital', hospitals[0]), false);
assert.equal(canEnterHospitalReport('at_hospital', hospitals[0]), true);
assert.equal(canEnterHospitalReport('at_hospital', hospitals[1]), false);
assert.equal(canEnterHospitalReport('at_hospital', null), false);
assert.equal(canEnterHospitalReport('on_scene', hospitals[0]), true);
assert.equal(canEnterHospitalReport('en_route', hospitals[0]), false);
assert.equal(canStartHospitalTransport('on_scene'), true);
assert.equal(canStartHospitalTransport('en_route'), false);

const locationRoute = readFileSync(
  join(process.cwd(), 'app/api/responder/location/route.ts'),
  'utf8',
);
assert.match(locationRoute, /HOSPITAL_DESTINATION_REQUIRED/);
assert.match(locationRoute, /HOSPITAL_DESTINATION_UNAVAILABLE/);
assert.match(locationRoute, /eq\(incidents\.id, incidentId\)/);
assert.match(locationRoute, /eq\(incidents\.status, 'ARRIVED'\)/);
assert.match(locationRoute, /transportHospitalId: currentHospital\.id/);
assert.match(locationRoute, /confirmHospitalArrival/);
assert.match(locationRoute, /autoArrivedHospitalIncidentId/);
assert.match(locationRoute, /dbUser\.status !== 'ACTIVE'/);
assert.match(locationRoute, /dbUser\.verificationStatus !== 'APPROVED'/);
assert.ok(
  locationRoute.indexOf('// Cache telemetry') < locationRoute.indexOf('if (transportValidationError)'),
  'trusted telemetry must be cached before returning a transport-context error',
);

const tracker = readFileSync(
  join(process.cwd(), 'mobile/hooks/use-broadcast-tracker.ts'),
  'utf8',
);
assert.match(tracker, /statusRef\.current === 'to_hospital'[\s\S]*!isEligibleHospitalDestination/);

console.log('Hospital destination policy checks passed.');
