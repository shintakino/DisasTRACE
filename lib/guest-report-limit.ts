import { createHash } from 'node:crypto';
import {
  DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT,
  MAX_GUEST_REPORTS_PER_PHONE_LIMIT,
} from './guest-report-limit-constants';

export {
  DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT,
  MAX_GUEST_REPORTS_PER_PHONE_LIMIT,
};

export function hasReachedGuestReportLimit(submittedReports: number, limit: number) {
  return submittedReports >= limit;
}

/** Hash a guest's Android app-scoped ID before it crosses into persistence. */
export function hashGuestDeviceId(deviceId: string) {
  return createHash('sha256').update(deviceId).digest('hex');
}
