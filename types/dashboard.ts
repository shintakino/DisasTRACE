import { z } from "zod";
import { IncidentStatusSchema } from "./verification";

export const KpiDataSchema = z.object({
  totalIncidentsToday: z.coerce.number(),
  activeIncidents: z.coerce.number(),
  pendingVerification: z.coerce.number(),
  totalResponders: z.coerce.number(),
  totalResolvedToday: z.coerce.number(),
  totalRejectedToday: z.coerce.number(),
  avgResponseTime: z.string(),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

export const IncidentTrendSchema = z.object({
  month: z.string(),
  vehicular: z.coerce.number(),
  medical: z.coerce.number(),
  structural: z.coerce.number(),
  fire: z.coerce.number(),
  water: z.coerce.number(),
  unknown: z.coerce.number(),
});

export type IncidentTrend = z.infer<typeof IncidentTrendSchema>;

export const IncidentDistributionSchema = z.object({
  name: z.string(),
  value: z.coerce.number(),
  fill: z.string(),
});

export type IncidentDistribution = z.infer<typeof IncidentDistributionSchema>;

export const RecentReportSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  vehicleId: z.string(),
  destination: z.string(),
  timestamp: z.string(),
  type: z.string(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  nature: z.enum(["EMERGENCY", "NON-EMERGENCY"]),
  requestStatus: z.enum(["PENDING", "VERIFIED", "REJECTED", "DUPLICATE"]),
  incidentStatus: IncidentStatusSchema.nullable(),
  requiresPaccReassignment: z.boolean(),
});

export type RecentReport = z.infer<typeof RecentReportSchema>;

export const ResponderSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  initials: z.string(),
});

export type Responder = z.infer<typeof ResponderSchema>;

export const AuditPreviewSchema = z.object({
  id: z.string(),
  actorName: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  timestamp: z.string(),
});

export type AuditPreview = z.infer<typeof AuditPreviewSchema>;

export const DashboardDataSchema = z.object({
  kpis: KpiDataSchema,
  trends: z.array(IncidentTrendSchema),
  distribution: z.array(IncidentDistributionSchema),
  reports: z.array(RecentReportSchema),
  responders: z.array(ResponderSchema),
  auditPreview: z.array(AuditPreviewSchema),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;
