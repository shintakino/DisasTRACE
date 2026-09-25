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
  | 'RESPONSE_COMPLETE';

/**
 * Maps the server-owned operational incident state to the public lifecycle.
 * Scene arrival permanently ends reporter tracking. Hospital transport,
 * documentation, and final case closure remain operational states for the
 * responder and command center and must never reopen the public map.
 */
export function getPublicResponseMode(input: {
  incidentStatus?: PublicIncidentStatus | null;
  transportStatus?: PublicTransportStatus | null;
  hasResponder?: boolean;
}): PublicResponseMode {
  if (
    input.incidentStatus === 'ARRIVED'
    || input.incidentStatus === 'DOCUMENTATION_PENDING'
    || input.incidentStatus === 'RESOLVED'
  ) return 'RESPONSE_COMPLETE';
  if (input.incidentStatus === 'EN_ROUTE' || input.hasResponder) return 'INBOUND_TRACKING';
  return 'WAITING';
}

export function isPublicResponseComplete(status: string | null | undefined): boolean {
  return status === 'ARRIVED' || status === 'DOCUMENTATION_PENDING' || status === 'RESOLVED';
}
