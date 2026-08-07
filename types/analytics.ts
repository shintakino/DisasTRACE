import { z } from "zod";

export const AnalyticsPeriodSchema = z.enum(["day", "week", "month"]);
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriodSchema>;

const IncidentFrequencySchema = z.object({
  type: z.string(),
  count: z.coerce.number(),
  color: z.string(),
});

const IncidentTrendPointSchema = z.object({
  label: z.string(),
  count: z.coerce.number(),
});

const AnalyticsSummarySchema = z.object({
  totalReported: z.coerce.number(),
  verified: z.coerce.number(),
  pending: z.coerce.number(),
  resolved: z.coerce.number(),
  resolutionRate: z.coerce.number(),
  avgResponseMinutes: z.coerce.number(),
});

const PreparednessInsightSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

export const AnalyticsDataSchema = z.object({
  period: AnalyticsPeriodSchema,
  frequencies: z.array(IncidentFrequencySchema),
  trends: z.array(IncidentTrendPointSchema),
  summary: AnalyticsSummarySchema,
  insights: z.array(PreparednessInsightSchema),
});

export type AnalyticsData = z.infer<typeof AnalyticsDataSchema>;
