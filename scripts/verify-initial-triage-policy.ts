import assert from 'node:assert/strict';
import { createPublicRequestId, deriveInitialTriage } from '../lib/initial-triage-policy';

assert.deepEqual(
  deriveInitialTriage({ incidentType: 'Unknown Cause', requestedNature: 'EMERGENCY', suspicious: false }),
  {
    nature: 'NON-EMERGENCY',
    classification: 'UNCERTAIN_INCOMPLETE',
    reasons: ['The incident cause and appropriate coordinating agency are unknown. PACC review is required.'],
  },
);
assert.equal(deriveInitialTriage({ incidentType: 'Fire Emergency', requestedNature: 'NON-EMERGENCY' }).nature, 'EMERGENCY');
assert.equal(deriveInitialTriage({ incidentType: 'Patient Transport', requestedNature: 'EMERGENCY' }).classification, 'HIGH_CONFIDENCE_NON_EMERGENCY');
assert.equal(deriveInitialTriage({ incidentType: 'Medical Emergency', suspicious: true }).classification, 'SUSPICIOUS_POSSIBLE_PRANK');
assert.equal(createPublicRequestId('f2df78f4-c5a4-48a7-92c5-2ef7288ce104', 2026), 'REQ-2026-F2DF78F4C5');
assert.equal(createPublicRequestId('f2df78f4-c5a4-48a7-92c5-2ef7288ce104', 2026).length <= 20, true);

console.log('Initial triage policy checks passed.');
