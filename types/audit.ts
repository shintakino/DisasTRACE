import { z } from "zod";

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  userName: z.string(),
  action: z.string(), // Primary description (e.g., "Accepted Ambulance Dispatch DR-2026-0047")
  contextPath: z.string(), // Breadcrumb/System path (e.g., "Home > Notifications > CDRRMO Updates")
  timestamp: z.string(), // ISO format preferred for internal data
  date: z.string(), // e.g., "21 March 2026"
  time: z.string(), // e.g., "09:43 AM"
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const AuditFilterSchema = z.object({
  search: z.string().optional(),
  userId: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});
export type AuditFilter = z.infer<typeof AuditFilterSchema>;
