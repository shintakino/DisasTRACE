import { z } from "zod";

export const UserStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING"]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserRoleSchema = z.enum([
  "public_user",
  "ambulance_responder",
  "pacc_admin",
  "cdrrmo_super_admin",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserManagementEntrySchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  status: UserStatusSchema,
  role: UserRoleSchema,
  joinedDate: z.string(),
  lastActive: z.string(),
});
export type UserManagementEntry = z.infer<typeof UserManagementEntrySchema>;

export const UserFilterSchema = z.object({
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
});
export type UserFilter = z.infer<typeof UserFilterSchema>;
