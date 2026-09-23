export type PublicIncidentStatus =
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DOCUMENTATION_PENDING'
  | 'RESOLVED';

export type PublicTransportStatus = 'NONE' | 'TO_HOSPITAL' | 'ARRIVED_AT_HOSPITAL';

export type PublicResponseMode =
  | 'WAITING'
  | 'INBOUND_TRACKING'
  | 'HELP_ARRIVED'
  | 'DOCUMENTATION_PENDING'
  | 'TRANSPORT_TRACKING'
  | 'TRANSPORT_COMPLETE'
  | 'CASE_CLOSED';

/**
 * Maps server-owned incident state to the one public-facing response state.
 * An on-scene documentation state is terminal for public live tracking. A
 * responder may already be available for another assignment while their
 * original incident retains responderId for audit ownership, so that ID must
 * never be treated as proof that their later GPS location is authorized for
 * the original reporter.
 */
export function getPublicResponseMode(input: {
  incidentStatus?: PublicIncidentStatus | null;
  transportStatus?: PublicTransportStatus | null;
  hasResponder?: boolean;
}): PublicResponseMode {
  if (input.incidentStatus === 'DOCUMENTATION_PENDING') return 'DOCUMENTATION_PENDING';
  if (input.transportStatus === 'ARRIVED_AT_HOSPITAL') return 'TRANSPORT_COMPLETE';
  if (input.transportStatus === 'TO_HOSPITAL') return 'TRANSPORT_TRACKING';
  if (input.incidentStatus === 'RESOLVED') return 'CASE_CLOSED';
  if (input.incidentStatus === 'ARRIVED') return 'HELP_ARRIVED';
  if (input.incidentStatus === 'EN_ROUTE' || input.hasResponder) return 'INBOUND_TRACKING';
  return 'WAITING';
}
