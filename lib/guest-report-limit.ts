import { createHash } from 'node:crypto';

export const DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT = 3;
export const MAX_GUEST_REPORTS_PER_PHONE_LIMIT = 100;

export function hasReachedGuestReportLimit(submittedReports: number, limit: number) {
  return submittedReports >= limit;
}

/** Hash a guest's Android app-scoped ID before it crosses into persistence. */
export function hashGuestDeviceId(deviceId: string) {
  return createHash('sha256').update(deviceId).digest('hex');
}
