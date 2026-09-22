import assert from 'node:assert/strict';
import { RecentReportSchema } from '../types/dashboard';
import { IncidentStatusSchema, VerificationIncidentSchema } from '../types/verification';

assert.equal(IncidentStatusSchema.parse('DOCUMENTATION_PENDING'), 'DOCUMENTATION_PENDING');
const verificationIncident = VerificationIncidentSchema.parse({ id: 'incident-1', status: 'DOCUMENTATION_PENDING' });
assert.ok(verificationIncident);
assert.equal(verificationIncident.status, 'DOCUMENTATION_PENDING');

const report = RecentReportSchema.parse({
  id: 'incident-1',
  requestId: 'REQ-2026-0001',
  vehicleId: 'Unassigned',
  destination: 'Baliwag City',
  timestamp: new Date().toISOString(),
  type: 'Medical Emergency',
  severity: 'High',
  nature: 'EMERGENCY',
  requestStatus: 'VERIFIED',
  incidentStatus: 'DOCUMENTATION_PENDING',
  requiresPaccReassignment: false,
});

assert.equal(report.incidentStatus, 'DOCUMENTATION_PENDING');
console.log('Incident status dashboard contract checks passed.');
