import { z } from "zod";

export const KpiDataSchema = z.object({
  totalIncidentsToday: z.number(),
  totalResponders: z.number(),
  totalResolvedToday: z.number(),
  avgResponseTime: z.string(),
});

export type KpiData = z.infer<typeof KpiDataSchema>;

export const IncidentTrendSchema = z.object({
  month: z.string(),
  vehicular: z.number(),
  medical: z.number(),
  structural: z.number(),
  fire: z.number(),
  water: z.number(),
  unknown: z.number(),
});

export type IncidentTrend = z.infer<typeof IncidentTrendSchema>;

export const IncidentDistributionSchema = z.object({
  name: z.string(),
  value: z.number(),
  fill: z.string(),
});

export type IncidentDistribution = z.infer<typeof IncidentDistributionSchema>;

export const RecentReportSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  origin: z.string(),
  destination: z.string(),
  timestamp: z.string(),
});

export type RecentReport = z.infer<typeof RecentReportSchema>;

export const ResponderSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  initials: z.string(),
});

export type Responder = z.infer<typeof ResponderSchema>;

export const DashboardDataSchema = z.object({
  kpis: KpiDataSchema,
  trends: z.array(IncidentTrendSchema),
  distribution: z.array(IncidentDistributionSchema),
  reports: z.array(RecentReportSchema),
  responders: z.array(ResponderSchema),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;
