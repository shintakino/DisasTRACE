import { z } from "zod";

export const ReportStatusSchema = z.enum(["NEW", "ONGOING", "COMPLETED", "STANDBY"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const IncidentTypeSchema = z.enum([
  "Vehicular Collision",
  "Medical Emergency",
  "Structural Failure",
  "Fire/Explosion",
  "Flood/Water",
  "Unknown Cause"
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const ReportFilterSchema = z.object({
  search: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  type: IncidentTypeSchema.optional(),
  status: ReportStatusSchema.optional(),
});
export type ReportFilter = z.infer<typeof ReportFilterSchema>;

export const DetailedIncidentReportSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  type: IncidentTypeSchema,
  origin: z.string(),
  destination: z.string(),
  timestamp: z.string(),
  status: ReportStatusSchema,
  responderName: z.string(),
  description: z.string().optional(),
  scenePhotos: z.array(z.string()), // URLs to Supabase Storage
  logs: z.array(z.object({
    action: z.string(),
    time: z.string(),
  })),
  participants: z.array(z.object({
    name: z.string(),
    contact: z.string(),
    triageStatus: z.string(),
  })).optional(),
});
export type DetailedIncidentReport = z.infer<typeof DetailedIncidentReportSchema>;

export const ReportTableItemSchema = DetailedIncidentReportSchema.pick({
  id: true,
  vehicleId: true,
  type: true,
  origin: true,
  destination: true,
  timestamp: true,
  status: true,
});
export type ReportTableItem = z.infer<typeof ReportTableItemSchema>;
