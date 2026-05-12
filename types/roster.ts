import { z } from "zod";

export const RosterStatusSchema = z.enum(["PRESENT", "ABSENT", "ON-LEAVE", "ON-DUTY"]);
export type RosterStatus = z.infer<typeof RosterStatusSchema>;

export const RosterEntrySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  department: z.string(),
  checkIn: z.string().nullable(), // Nullable if they haven't checked in yet
  checkOut: z.string().nullable(), // Nullable if they are still on duty
  logHours: z.string().optional(), // "HH:MM:SS"
  status: RosterStatusSchema,
});
export type RosterEntry = z.infer<typeof RosterEntrySchema>;

export const RosterFilterSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: RosterStatusSchema.optional(),
  date: z.date().optional(),
});
export type RosterFilter = z.infer<typeof RosterFilterSchema>;
