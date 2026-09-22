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
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});
export type UserManagementEntry = z.infer<typeof UserManagementEntrySchema>;

export const UserFilterSchema = z.object({
  search: z.string().optional(),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type UserFilter = z.infer<typeof UserFilterSchema>;
