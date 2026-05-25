import { z } from "zod";

export const RosterStatusSchema = z.enum(["ACTIVE", "DEACTIVATED", "SUSPENDED"]);
export type RosterStatus = z.infer<typeof RosterStatusSchema>;

export const RosterEntrySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.string(),
  status: RosterStatusSchema,
});
export type RosterEntry = z.infer<typeof RosterEntrySchema>;

export const RosterFilterSchema = z.object({
  search: z.string().optional(),
  status: RosterStatusSchema.optional(),
});
export type RosterFilter = z.infer<typeof RosterFilterSchema>;
