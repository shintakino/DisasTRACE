const SEVERITY_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export interface QueuePriorityItem {
  id: string;
  severity?: string | null;
  receivedAt: string;
  requiresPaccReassignment?: boolean;
}

export function compareActiveVerificationItems(a: QueuePriorityItem, b: QueuePriorityItem) {
  const severity = (SEVERITY_RANK[b.severity ?? ''] ?? 0) - (SEVERITY_RANK[a.severity ?? ''] ?? 0);
  if (severity !== 0) return severity;
  const reassignment = Number(Boolean(b.requiresPaccReassignment)) - Number(Boolean(a.requiresPaccReassignment));
  if (reassignment !== 0) return reassignment;
  const newest = new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  return newest !== 0 ? newest : a.id.localeCompare(b.id);
}

export function isNewVerificationItem(receivedAt: string, now = Date.now()) {
  const age = now - new Date(receivedAt).getTime();
  return age >= 0 && age <= 2 * 60 * 1000;
}
