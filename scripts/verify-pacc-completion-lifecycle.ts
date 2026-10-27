import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyActiveVerificationBucket, classifyVerificationWorkspaceFilter, getPaccRejectionConflict } from '../lib/rejected-report-workflow';
import { evaluateManualDispatchEligibility } from '../lib/dispatch-policy';

for (const requestStatus of ['PENDING', 'VERIFIED'] as const) {
  for (const incidentStatus of ['EN_ROUTE', 'ARRIVED', 'DOCUMENTATION_PENDING', 'RESOLVED'] as const) {
    const state = { requestStatus, incidentStatus, responderId: 'owner', triageClassification: 'HIGH_CONFIDENCE_EMERGENCY' };
    assert.equal(classifyActiveVerificationBucket(state), null, 'Accepted or completed field work cannot re-enter PACC triage.');
    if (incidentStatus === 'RESOLVED') assert.equal(classifyVerificationWorkspaceFilter(state), 'CLOSED');
    if (incidentStatus === 'DOCUMENTATION_PENDING' || incidentStatus === 'RESOLVED') {
      assert.equal(getPaccRejectionConflict({ requestStatus, incident: state })?.code, 'REQUEST_TERMINAL');
    }
    assert.equal(evaluateManualDispatchEligibility({ requestStatus,
      incident: { status:incidentStatus,responderId:'owner',currentOfferResponderId:null },
      responder:{role:'ambulance_responder',status:'ACTIVE',verificationStatus:'APPROVED',dutyStatus:'ON_DUTY',lastLocationUpdatedAt:new Date()},
    }).allowed, false);
  }
}
assert.equal(classifyActiveVerificationBucket({requestStatus:'VERIFIED',incidentStatus:'DISPATCHED',responderId:null,currentOfferResponderId:null,requiresPaccReassignment:true,triageClassification:'HIGH_CONFIDENCE_EMERGENCY'}),'ACTION');
assert.equal(classifyActiveVerificationBucket({requestStatus:'PENDING',incidentStatus:'DISPATCHED',responderId:null,currentOfferResponderId:'owner'}),'AWAITING');
assert.equal(classifyVerificationWorkspaceFilter({requestStatus:'REJECTED',incidentStatus:'RESOLVED'}),'REJECTED');
const page=readFileSync('app/(dashboard)/verification/page.tsx','utf8');
assert.match(page,/version === fetchVersionRef\.current/);
const dispatch=readFileSync('app/api/verification/[id]/dispatch/route.ts','utf8');
assert.ok(dispatch.indexOf('const submitted =') < dispatch.indexOf('const reserved ='), 'Final-report protection precedes responder reservation.');
console.log('PASS PACC lifecycle: completed/accepted work stays outside triage, expired offers remain actionable, and stale reads are guarded');
