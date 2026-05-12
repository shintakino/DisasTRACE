import { z } from "zod";

export const ReportStatusSchema = z.enum(["DRAFT", "SUBMITTED"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const IncidentTypeSchema = z.enum([
  "Fire Emergency",
  "Vehicular Collision",
  "Medical Emergency",
  "Structural Failure",
  "Flood/Water",
  "Unknown Cause",
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const ReportEntrySchema = z.object({
  id: z.string(), // Case ID
  responderName: z.string(),
  type: IncidentTypeSchema,
  status: ReportStatusSchema,
  date: z.string(), // e.g., "21 March 2026"
  time: z.string(), // e.g., "09:43 AM"
  location: z.string(),
});
export type ReportEntry = z.infer<typeof ReportEntrySchema>;

export const ReportFilterSchema = z.object({
  search: z.string().optional(),
  type: IncidentTypeSchema.optional(),
  status: ReportStatusSchema.optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});
export type ReportFilter = z.infer<typeof ReportFilterSchema>;

export const DetailedIncidentReportSchema = z.object({
  id: z.string(),
  responderName: z.string(),
  vehicleId: z.string(),
  type: IncidentTypeSchema,
  status: ReportStatusSchema,
  date: z.string(),
  time: z.string(),
  location: z.string(),
  description: z.string().optional(),
  scenePhotos: z.array(z.string()), // URLs to Supabase Storage
  logs: z.array(
    z.object({
      action: z.string(),
      time: z.string(),
    })
  ),
  participants: z.array(
    z.object({
      name: z.string(),
      contact: z.string(),
      triageStatus: z.string(),
    })
  ).optional(),
});
export type DetailedIncidentReport = z.infer<typeof DetailedIncidentReportSchema>;
