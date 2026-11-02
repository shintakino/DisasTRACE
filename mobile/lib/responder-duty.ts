const HEARTBEAT_MAX_AGE_MS = 90_000;

/** Do not resume a previously ON_DUTY session from an expired GPS heartbeat. */
export function effectiveResponderDutyStatus(
  dutyStatus: string | null | undefined,
  lastLocationUpdatedAt: string | Date | null | undefined,
  now = Date.now(),
): 'OFF_DUTY' | 'ON_DUTY' | 'ACTIVE_DISPATCH' {
  if (dutyStatus === 'ACTIVE_DISPATCH') return 'ACTIVE_DISPATCH';
  if (dutyStatus !== 'ON_DUTY') return 'OFF_DUTY';
  if (!lastLocationUpdatedAt) return 'OFF_DUTY';

  const timestamp = new Date(lastLocationUpdatedAt).getTime();
  return Number.isFinite(timestamp) && now - timestamp <= HEARTBEAT_MAX_AGE_MS
    ? 'ON_DUTY'
    : 'OFF_DUTY';
}
