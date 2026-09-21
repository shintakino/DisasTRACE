const GUEST_REPORT_TOKEN_PREFIX = 'disastrace-guest-report-token-v1-';

/** Expo SecureStore accepts only letters, digits, periods, hyphens, and underscores in a key. */
export function guestReportAccessTokenKey(reportId: string) {
  const normalizedId = reportId.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(normalizedId)) {
    throw new Error('This report cannot be stored securely on this device.');
  }
  return `${GUEST_REPORT_TOKEN_PREFIX}${normalizedId}`;
}
