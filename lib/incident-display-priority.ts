const SEVERITY_RANK: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const TERMINAL_STATUSES = new Set(['REJECTED', 'DUPLICATE', 'RESOLVED', 'COMPLETED']);

export interface OperationalIncident {
  id: string;
  severity?: string | null;
  status: string;
  createdAt: string;
  requiresPaccReassignment?: boolean;
}

function safeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function isOperationalIncidentActive(item: Pick<OperationalIncident, 'status'>) {
  return !TERMINAL_STATUSES.has(item.status);
}

export function compareOperationalIncidents(a: OperationalIncident, b: OperationalIncident) {
  const active = Number(isOperationalIncidentActive(b)) - Number(isOperationalIncidentActive(a));
  if (active !== 0) return active;
  const severity = (SEVERITY_RANK[b.severity ?? ''] ?? 0) - (SEVERITY_RANK[a.severity ?? ''] ?? 0);
  if (severity !== 0) return severity;
  const reassignment = Number(Boolean(b.requiresPaccReassignment)) - Number(Boolean(a.requiresPaccReassignment));
  if (reassignment !== 0) return reassignment;
  const newest = safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt);
  return newest !== 0 ? newest : a.id.localeCompare(b.id);
}

export function selectOperationalPriority<T extends OperationalIncident>(items: readonly T[]): T | null {
  const active = items.filter(isOperationalIncidentActive);
  return active.length ? active.sort(compareOperationalIncidents)[0] : null;
}
