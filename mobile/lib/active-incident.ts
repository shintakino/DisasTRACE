export type ResidentRequestSnapshot = {
  status?: string | null;
  incidentStatus?: string | null;
};

/** Only inbound dispatch states should take a resident away from Home. */
export function shouldResumeResidentRequest(request: ResidentRequestSnapshot): boolean {
  if (request.status === 'PENDING') return true;
  return request.status === 'VERIFIED'
    && (request.incidentStatus === 'DISPATCHED' || request.incidentStatus === 'EN_ROUTE');
}
