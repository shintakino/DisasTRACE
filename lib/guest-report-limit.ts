export const DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT = 3;
export const MAX_GUEST_REPORTS_PER_PHONE_LIMIT = 100;

export function hasReachedGuestReportLimit(submittedReports: number, limit: number) {
  return submittedReports >= limit;
}
