import { z } from 'zod';
import type { DispatchDetails, ResponderState } from '../stores/useResponderStore';
import { getRestoredResponderState } from './responder-lifecycle-policy';
import { formatManilaMobileTime } from './manila-presentation';

export const ResponderRecoverySchema = z.object({
  dutyStatus: z.enum(['ON_DUTY', 'OFF_DUTY', 'ACTIVE_DISPATCH']),
  dispatch: z.object({
    id: z.string().min(1), isOffer: z.boolean(),
    status: z.enum(['DISPATCHED', 'EN_ROUTE', 'ARRIVED']),
    transportStatus: z.enum(['NONE', 'TO_HOSPITAL', 'ARRIVED_AT_HOSPITAL']),
    transportHospitalId: z.string().nullable(),
    type: z.string(), natureOfCall: z.string(), locationName: z.string(),
    latitude: z.number().finite(), longitude: z.number().finite(), peopleInvolved: z.number().int().positive(),
    etaMinutes: z.number().nullable(), createdAt: z.string(), dispatchOfferDurationSeconds: z.number().positive(),
    offerExpiresAt: z.string().nullable(), assignedAmbulance: z.string().nullable(), attachmentUrl: z.string().nullable(),
    reporterName: z.string(), reporterPhone: z.string().nullable(),
  }).nullable(),
});
export type ResponderRecovery = z.infer<typeof ResponderRecoverySchema>;

export function recoveryPatch(current: Pick<ResponderState, 'status' | 'activeDispatch'>, data: ResponderRecovery): Partial<ResponderState> {
  const incoming = data.dispatch;
  if (!incoming) return {};
  const sameIncident = current.activeDispatch?.id === incoming.id;
  const restored = incoming.isOffer ? 'dispatch_offered' : getRestoredResponderState(incoming.status, incoming.transportStatus);
  if (!restored) return {};
  const rank = { idle: 0, dispatch_offered: 1, en_route: 2, on_scene: 3, to_hospital: 4, at_hospital: 5, report_filling: 6 };
  // Confirmed transport and an offline arrival cannot regress on an older read.
  const status = sameIncident && rank[current.status] > rank[restored] ? current.status : restored;
  const dispatch: DispatchDetails = {
    id: incoming.id, type: incoming.type, typeOfEmergency: incoming.type,
    locationName: incoming.locationName, distance: sameIncident ? current.activeDispatch!.distance : 'Distance pending',
    natureOfCall: incoming.natureOfCall, peopleInvolved: incoming.peopleInvolved,
    eta: incoming.etaMinutes ? `~${incoming.etaMinutes} min` : 'Calculating',
    reporterName: incoming.reporterName, reporterPhone: incoming.reporterPhone || undefined,
    reporterInitials: incoming.reporterName.trim().split(/\s+/).map(name => name[0]).join('').slice(0, 2).toUpperCase(),
    timestamp: formatManilaMobileTime(incoming.createdAt) ?? 'Time unavailable',
    coordinates: { latitude: incoming.latitude, longitude: incoming.longitude },
    dispatchOfferDurationSeconds: incoming.dispatchOfferDurationSeconds, offerExpiresAt: incoming.offerExpiresAt || undefined,
    assignedAmbulance: incoming.assignedAmbulance || undefined,
    transportHospitalId: incoming.transportHospitalId || (sameIncident ? current.activeDispatch?.transportHospitalId : undefined),
    attachmentUrl: incoming.attachmentUrl || undefined,
  };
  return {
    status, activeDispatch: dispatch, recoveryError: null,
    ...(!sameIncident ? {
      isStartingHospitalTransport: false,
      targetHospital: null, fieldOutcome: null, sceneTimeSeconds: 0, elapsedTimeSeconds: 0,
      isArrivalConfirmVisible: false, isHospitalArrivalConfirmVisible: false, isHospitalArrivalPendingSync: false,
      hospitalDistanceKm: null, hospitalEtaMins: null, dispatchReleaseNotice: null,
    } : {}),
    ...(status === 'at_hospital' ? { fieldOutcome: 'HOSPITAL_ARRIVAL', isHospitalArrivalPendingSync: false } : {}),
  };
}
