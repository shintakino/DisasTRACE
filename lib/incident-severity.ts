export type IncidentAlertPriority = "critical" | "severe" | "standard";

export const INCIDENT_ALERT_PRIORITY_RANK: Record<IncidentAlertPriority, number> = {
  standard: 0,
  severe: 1,
  critical: 2,
};

export function getIncidentAlertPriority(severity: string | null | undefined): IncidentAlertPriority {
  const normalizedSeverity = severity?.trim().toLowerCase();

  if (normalizedSeverity === "critical") {
    return "critical";
  }

  if (normalizedSeverity === "high" || normalizedSeverity === "severe") {
    return "severe";
  }

  return "standard";
}
