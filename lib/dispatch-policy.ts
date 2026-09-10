export interface AutomaticDispatchRetryState {
  status: string;
  nature: string;
  triageClassification: string;
}

export interface DispatchOfferState {
  status: string;
  currentOfferResponderId: string | null;
  responderId: string | null;
  offerExpiresAt?: Date | string | null;
}

export interface ManualDispatchResponderState {
  role: string;
  status: string;
  verificationStatus: string;
  dutyStatus: string;
  lastLocationUpdatedAt: Date | string | null;
}

export interface ManualDispatchEligibilityInput {
  requestStatus: string;
  incident: DispatchOfferState | null;
  responder: ManualDispatchResponderState;
  now?: Date;
  allowStaleHeartbeat?: boolean;
}

export type ManualDispatchEligibility =
  | { allowed: true }
  | {
    allowed: false;
    code: 'REPORT_CLOSED' | 'ACTIVE_DISPATCH_EXISTS' | 'RESPONDER_UNAVAILABLE' | 'RESPONDER_OFFLINE';
    message: string;
  };

// On-duty telemetry is sent every few seconds. A one-minute limit lets a
// transient network interruption recover while releasing a switched-off device
// quickly enough that it cannot remain dispatchable as standby.
export const RESPONDER_HEARTBEAT_FRESHNESS_MS = 60 * 1000;

export function isResponderHeartbeatFresh(
  lastLocationUpdatedAt: Date | string | null,
  now = new Date(),
) {
  if (!lastLocationUpdatedAt) return false;

  const updatedAt = new Date(lastLocationUpdatedAt).getTime();
  return Number.isFinite(updatedAt)
    && updatedAt >= now.getTime() - RESPONDER_HEARTBEAT_FRESHNESS_MS;
}

export function evaluateManualDispatchEligibility({
  requestStatus,
  incident,
  responder,
  now = new Date(),
  allowStaleHeartbeat = false,
}: ManualDispatchEligibilityInput): ManualDispatchEligibility {
  if (requestStatus === 'REJECTED' || requestStatus === 'DUPLICATE') {
    return {
      allowed: false,
      code: 'REPORT_CLOSED',
      message: 'This report was already rejected or marked as a duplicate. Refresh the verification queue.',
    };
  }

  if (
    incident
    && (
      incident.status !== 'DISPATCHED'
      || incident.responderId !== null
      || incident.currentOfferResponderId !== null
    )
  ) {
    return {
      allowed: false,
      code: 'ACTIVE_DISPATCH_EXISTS',
      message: 'This report already has an active dispatch offer. Refresh the verification queue.',
    };
  }

  if (
    responder.role !== 'ambulance_responder'
    || responder.status !== 'ACTIVE'
    || responder.verificationStatus !== 'APPROVED'
    || responder.dutyStatus !== 'ON_DUTY'
  ) {
    return {
      allowed: false,
      code: 'RESPONDER_UNAVAILABLE',
      message: 'Selected responder is no longer available.',
    };
  }

  if (!allowStaleHeartbeat && !isResponderHeartbeatFresh(responder.lastLocationUpdatedAt, now)) {
    return {
      allowed: false,
      code: 'RESPONDER_OFFLINE',
      message: 'Selected responder is offline or has a stale location. Choose a standby responder.',
    };
  }

  return { allowed: true };
}

export function shouldRetryAutomaticDispatch(request: AutomaticDispatchRetryState) {
  return request.status === 'PENDING'
    && request.nature === 'EMERGENCY'
    && request.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY';
}

/** Only the oldest eligible pending request may reserve an automatic unit. */
export function canClaimAutomaticDispatchTurn(queueHeadRequestId: string | null | undefined, requestId: string) {
  return queueHeadRequestId === requestId;
}

export function canResponderAcceptDispatchOffer(
  incident: DispatchOfferState,
  responderId: string,
  now = new Date(),
) {
  return incident.status === 'DISPATCHED'
    && incident.currentOfferResponderId === responderId
    && incident.responderId === null
    && incident.offerExpiresAt !== null
    && incident.offerExpiresAt !== undefined
    && new Date(incident.offerExpiresAt).getTime() > now.getTime();
}

export function canCascadeDispatchOffer(
  incident: DispatchOfferState,
  responderId: string,
) {
  // A cascade must still be able to claim an expired offer. Expiry prevents
  // acceptance, not safe release of the responder reservation.
  return incident.status === 'DISPATCHED'
    && incident.currentOfferResponderId === responderId
    && incident.responderId === null;
}
