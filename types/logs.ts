import { z } from "zod";

export const LogStatusSchema = z.enum(["DISPATCHED", "STANDBY", "ON-SCENE", "OFF-DUTY"]);
export type LogStatus = z.infer<typeof LogStatusSchema>;

export const LogActionSchema = z.enum(["DISPATCHED", "COMPLETED", "ARRIVED", "STARTED", "ENDED", "NONE"]);
export type LogAction = z.infer<typeof LogActionSchema>;

export const StatusLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(), // ISO format preferred for internal data
  date: z.string(), // e.g., "21 March 2026"
  time: z.string(), // e.g., "09:43 AM"
  responderName: z.string(),
  logDescription: z.string(),
  status: LogStatusSchema,
  action: LogActionSchema,
});
export type StatusLogEntry = z.infer<typeof StatusLogEntrySchema>;

export const LogFilterSchema = z.object({
  search: z.string().optional(),
  status: LogStatusSchema.optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});
export type LogFilter = z.infer<typeof LogFilterSchema>;
