import assert from 'node:assert/strict';
import { BALIWAG_BARANGAYS, isWithinOfficialBaliwagBoundary, resolveBaliwagBarangay } from '../lib/barangay-boundaries';

assert.equal(BALIWAG_BARANGAYS.length, 27);
assert.equal(resolveBaliwagBarangay(14.96, 120.9)?.name, 'Bagong Nayon');
assert.equal(resolveBaliwagBarangay(14.8, 120.8), null);
// This point falls inside the former rectangular geofence but outside all
// official Baliwag barangay polygons, so it must never be accepted for intake.
assert.equal(isWithinOfficialBaliwagBoundary(14.901, 120.801), false);

console.log('Official Baliwag barangay boundary checks passed.');
