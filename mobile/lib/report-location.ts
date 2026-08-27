const DETAIL_LABEL = /(?:^|\s+)(?=(?:Condition|Access|Time|Cause|Other):)/i;
const DETAIL_ONLY = /^(?:Condition|Access|Time|Cause|Other):/i;
const REJECTION_PREFIX = /^REJECTED:\s*[^.]+\.\s*/i;

export function getReportLocation(value: string | null | undefined, fallback = 'Baliwag City'): string {
  const raw = value?.trim();
  if (!raw) return fallback;

  const location = raw.replace(REJECTION_PREFIX, '').split(DETAIL_LABEL)[0]?.trim();
  if (!location || DETAIL_ONLY.test(location)) return fallback;
  return location;
}

const RESPONDER_ONLY_NOTIFICATION_TYPES = new Set([
  'new_incident',
  'dispatch_alert',
  'dispatch_accepted',
  'manual_dispatch_offered',
  'manual_dispatch_accepted',
  'manual_dispatch_rejected',
  'report_audited',
]);

export function isNotificationVisibleForRole(type: string, role: string | null | undefined): boolean {
  return role !== 'public_user' || !RESPONDER_ONLY_NOTIFICATION_TYPES.has(type);
}
