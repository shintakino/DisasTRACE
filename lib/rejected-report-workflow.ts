export const MAX_REJECTION_REASON_LENGTH = 250;

export type VerificationRequestStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DUPLICATE';
export type VerificationIncidentStatus = 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'DOCUMENTATION_PENDING' | 'RESOLVED';
export type VerificationQueueClassification = 'ACTIVE' | 'REJECTED' | 'CASE_CLOSED';
export type ActiveVerificationBucket = 'ACTION' | 'REVIEW' | 'AWAITING';

interface VerificationQueueState {
  requestStatus: VerificationRequestStatus;
  incidentStatus?: VerificationIncidentStatus | null;
}

interface ActionableVerificationQueueState extends VerificationQueueState {
  triageClassification?: string | null;
  requiresPaccReassignment?: boolean;
  responderId?: string | null;
  currentOfferResponderId?: string | null;
}

/**
 * PACC may reject a report until a responder has accepted it. An unanswered
 * offer is not an active response: once the dispatcher releases the offer it
 * leaves a DISPATCHED incident with no assigned responder and no current offer.
 */
export function canPaccRejectVerificationRequest(input: {
  requestStatus: VerificationRequestStatus;
  incident?: Pick<ActionableVerificationQueueState, 'incidentStatus' | 'responderId' | 'currentOfferResponderId'> | null;
}) {
  if (input.requestStatus !== 'PENDING' && input.requestStatus !== 'VERIFIED') return false;
  if (!input.incident) return input.requestStatus === 'PENDING';

  return input.incident.incidentStatus === 'DISPATCHED'
    && !input.incident.responderId
    && !input.incident.currentOfferResponderId;
}

/**
 * Rejection is a PACC triage outcome. Case Closed means that an accepted
 * report completed its response lifecycle. A rejected report always remains
 * rejected even if inconsistent legacy data still points at a resolved case.
 */
export function classifyVerificationQueueItem(
  input: VerificationQueueState,
): VerificationQueueClassification {
  if (input.requestStatus === 'REJECTED') return 'REJECTED';
  if (input.requestStatus === 'VERIFIED' && input.incidentStatus === 'RESOLVED') {
    return 'CASE_CLOSED';
  }
  return 'ACTIVE';
}

export function classifyActiveVerificationBucket(
  input: ActionableVerificationQueueState,
): ActiveVerificationBucket | null {
  if (classifyVerificationQueueItem(input) !== 'ACTIVE') return null;

  const awaitingResponder = input.requestStatus === 'VERIFIED'
    && input.incidentStatus === 'DISPATCHED'
    && !input.responderId
    && Boolean(input.currentOfferResponderId);
  if (awaitingResponder) return 'AWAITING';

  const needsDispatch = input.requiresPaccReassignment === true || (
    input.requestStatus === 'VERIFIED'
    && input.incidentStatus === 'DISPATCHED'
    && !input.responderId
    && !input.currentOfferResponderId
  );
  if (input.requestStatus !== 'PENDING' && !needsDispatch) return null;

  return input.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY'
    || input.triageClassification === 'HIGH_CONFIDENCE_NON_EMERGENCY'
    ? 'ACTION'
    : 'REVIEW';
}

export function normalizeRequiredRejectionReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_REJECTION_REASON_LENGTH);
}

export function projectReporterReportStatus(input: {
  requestStatus: VerificationRequestStatus;
  incidentStatus?: VerificationIncidentStatus | null;
  rejectionReason?: string | null;
}) {
  const outcome = classifyVerificationQueueItem(input);
  const rejectionReason = normalizeRequiredRejectionReason(input.rejectionReason);

  if (outcome === 'REJECTED') {
    const cancelledByReporter = rejectionReason?.startsWith('Cancelled by the reporter') === true;
    if (cancelledByReporter) {
      return {
        status: input.requestStatus,
        outcome: 'CANCELLED',
        terminal: true,
        rejectionReason,
        responseStatus: 'You cancelled this report before response started. PACC will not dispatch it, and you may submit a new report.',
      } as const;
    }
    const reasonText = rejectionReason
      ? ` Reason: ${rejectionReason}`
      : ' Please contact PACC if you need the rejection reason.';
    return {
      status: input.requestStatus,
      outcome,
      terminal: true,
      rejectionReason,
      responseStatus: `PACC rejected this report.${reasonText} You can submit a new report if assistance is still needed.`,
    } as const;
  }

  if (outcome === 'CASE_CLOSED') {
    return {
      status: input.requestStatus,
      outcome,
      terminal: true,
      rejectionReason: null,
      responseStatus: 'Case Closed. Emergency response coordination has been completed.',
    } as const;
  }

  return {
    status: input.requestStatus,
    outcome,
    terminal: false,
    rejectionReason: null,
    responseStatus: 'PACC is reviewing or coordinating this report.',
  } as const;
}
