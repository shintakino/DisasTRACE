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

/** A released offer needs a human PACC reassignment, not a fresh client retry. */
export function requiresPaccReassignment(incident: DispatchOfferState | null | undefined) {
  return Boolean(
    incident
    && incident.status === 'DISPATCHED'
    && incident.responderId === null
    && incident.currentOfferResponderId === null,
  );
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
    code: 'REPORT_REJECTED' | 'REPORT_DUPLICATE' | 'REPORT_CLOSED' | 'ACTIVE_DISPATCH_EXISTS' | 'RESPONDER_UNAVAILABLE' | 'RESPONDER_OFFLINE';
    message: string;
  };

// On-duty telemetry is sent every few seconds, but GPS and background-network
// handoffs can briefly delay a successful write. Ninety seconds covers that
// short recovery window without leaving a switched-off device dispatchable.
export const RESPONDER_HEARTBEAT_FRESHNESS_MS = 90 * 1000;

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
  if (requestStatus === 'REJECTED') {
    return {
      allowed: false,
      code: 'REPORT_REJECTED',
      message: 'This report was rejected and cannot be dispatched. Review its rejection record.',
    };
  }
  if (requestStatus === 'DUPLICATE') {
    return {
      allowed: false,
      code: 'REPORT_DUPLICATE',
      message: 'This report was merged as a duplicate and cannot be dispatched separately.',
    };
  }
  if (incident?.status === 'RESOLVED') {
    return {
      allowed: false,
      code: 'REPORT_CLOSED',
      message: 'This response is Case Closed and cannot be dispatched again.',
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

export interface AutomaticDispatchPriorityItem {
  id: string;
  severity: string;
  createdAt: Date | string;
}

const AUTOMATIC_SEVERITY_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function prioritizeAutomaticDispatchRequests<T extends AutomaticDispatchPriorityItem>(requests: T[]) {
  return [...requests].sort((a, b) => {
    const severity = (AUTOMATIC_SEVERITY_RANK[b.severity] ?? 0) - (AUTOMATIC_SEVERITY_RANK[a.severity] ?? 0);
    if (severity !== 0) return severity;
    const fifo = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return fifo !== 0 ? fifo : a.id.localeCompare(b.id);
  });
}

export function selectNextDispatchableRequest<T extends AutomaticDispatchPriorityItem>(
  requests: T[],
  dispatchableRequestIds: ReadonlySet<string>,
) {
  return prioritizeAutomaticDispatchRequests(requests).find((request) => dispatchableRequestIds.has(request.id)) ?? null;
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
