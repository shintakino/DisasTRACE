export type ResidentRequestSnapshot = {
  status?: string | null;
  incidentStatus?: string | null;
};

/** Only these states should cause Home to restore a report and navigate away. */
export function shouldResumeResidentRequest(request: ResidentRequestSnapshot): boolean {
  if (request.status === 'PENDING') return true;
  return request.status === 'VERIFIED' && request.incidentStatus !== 'RESOLVED';
}
