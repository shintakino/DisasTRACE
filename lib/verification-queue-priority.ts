const SEVERITY_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export interface QueuePriorityItem {
  id: string;
  severity?: string | null;
  receivedAt: string;
  requiresPaccReassignment?: boolean;
}

function safeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function compareActiveVerificationItems(a: QueuePriorityItem, b: QueuePriorityItem) {
  const severity = (SEVERITY_RANK[b.severity ?? ''] ?? 0) - (SEVERITY_RANK[a.severity ?? ''] ?? 0);
  if (severity !== 0) return severity;
  const reassignment = Number(Boolean(b.requiresPaccReassignment)) - Number(Boolean(a.requiresPaccReassignment));
  if (reassignment !== 0) return reassignment;
  const newest = safeTimestamp(b.receivedAt) - safeTimestamp(a.receivedAt);
  return newest !== 0 ? newest : a.id.localeCompare(b.id);
}

export function selectHighestPriorityVerificationItem<T extends QueuePriorityItem>(items: readonly T[]): T | null {
  return items.length > 0 ? [...items].sort(compareActiveVerificationItems)[0] : null;
}

export function getVerificationPriorityReason(item: QueuePriorityItem) {
  const severity = item.severity && SEVERITY_RANK[item.severity] ? `${item.severity} severity` : 'Awaiting severity review';
  return item.requiresPaccReassignment
    ? `${severity} • responder reassignment required`
    : `${severity} • newest within this priority level`;
}

export function isNewVerificationItem(receivedAt: string, now = Date.now()) {
  const timestamp = new Date(receivedAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const age = now - timestamp;
  return age >= 0 && age <= 2 * 60 * 1000;
}
