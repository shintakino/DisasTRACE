export type MapDisplayStatus = 'ACTIVE' | 'RESOLVED' | 'REJECTED';

interface MapDisplayStatusInput {
  requestStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DUPLICATE';
  incidentStatus?: 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'DOCUMENTATION_PENDING' | 'RESOLVED' | null;
}

/**
 * Projects the request and its optional operational incident into the one
 * status used by command-map counters, filters, cards, and markers.
 */
export function projectMapDisplayStatus({ requestStatus, incidentStatus }: MapDisplayStatusInput): MapDisplayStatus {
  if (requestStatus === 'REJECTED' || requestStatus === 'DUPLICATE') return 'REJECTED';
  if (incidentStatus === 'RESOLVED') return 'RESOLVED';
  return 'ACTIVE';
}
