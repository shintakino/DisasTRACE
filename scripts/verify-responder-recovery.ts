import assert from 'node:assert/strict';
import { ResponderRecoverySchema, recoveryPatch } from '../mobile/lib/responder-recovery';
import type { DispatchDetails, DispatchState } from '../mobile/stores/useResponderStore';

const dispatch: DispatchDetails = {
  id: 'A', type: 'Medical Emergency', locationName: 'Pagala, Baliwag City', distance: '1 km',
  natureOfCall: 'EMERGENCY', peopleInvolved: 1, reporterName: 'Resident', reporterInitials: 'R', timestamp: '12:00',
  coordinates: { latitude: 14.95, longitude: 120.9 }, transportHospitalId: 'hospital',
};
const snapshot = ResponderRecoverySchema.parse({ dutyStatus: 'ACTIVE_DISPATCH', dispatch: {
  id: 'A', isOffer: false, status: 'EN_ROUTE', transportStatus: 'NONE', transportHospitalId: null,
  type: dispatch.type, natureOfCall: dispatch.natureOfCall, locationName: dispatch.locationName,
  latitude: 14.95, longitude: 120.9, peopleInvolved: 1, etaMinutes: null,
  createdAt: '2026-10-27T04:00:00Z', dispatchOfferDurationSeconds: 30, offerExpiresAt: null,
  assignedAmbulance: 'AMB-1', attachmentUrl: null, reporterName: 'Resident', reporterPhone: null,
} });
for (const status of ['en_route', 'on_scene', 'to_hospital', 'at_hospital', 'report_filling'] as DispatchState[]) {
  const patch = recoveryPatch({ status, activeDispatch: dispatch }, snapshot);
  assert.equal(patch.status, status, 'An older same-incident snapshot cannot regress field progress.');
  assert.equal(patch.activeDispatch?.transportHospitalId, 'hospital');
}
const offer = { ...snapshot, dispatch: { ...snapshot.dispatch!, isOffer: true, status: 'DISPATCHED' as const } };
assert.equal(recoveryPatch({ status: 'en_route', activeDispatch: dispatch }, offer).status, 'en_route');
assert.equal(recoveryPatch({ status: 'dispatch_offered', activeDispatch: dispatch }, snapshot).status, 'en_route', 'A lost acceptance response recovers from the owned server response.');
const arrived = { ...snapshot, dispatch: { ...snapshot.dispatch!, status: 'ARRIVED' as const, transportStatus: 'ARRIVED_AT_HOSPITAL' as const } };
assert.equal(recoveryPatch({ status: 'to_hospital', activeDispatch: dispatch }, arrived).status, 'at_hospital');
const newer = { ...offer, dispatch: { ...offer.dispatch, id: 'B' } };
const patch = recoveryPatch({ status: 'on_scene', activeDispatch: dispatch }, newer);
assert.equal(patch.status, 'dispatch_offered');
assert.equal(patch.activeDispatch?.id, 'B');
assert.equal(patch.targetHospital, null, 'A new incident cannot inherit the old hospital.');
assert.equal('reportFormSession' in patch, false, 'An older documentation draft stays separate from operational recovery.');
assert.deepEqual(recoveryPatch({ status: 'en_route', activeDispatch: dispatch }, { dutyStatus: 'ON_DUTY', dispatch: null }), {});
assert.equal(ResponderRecoverySchema.safeParse({ ...snapshot, dispatch: { ...snapshot.dispatch, status: 'RESOLVED' } }).success, false);
console.log('PASS responder recovery: lost acceptance, monotonic progress, transport, new offers, and draft isolation');
