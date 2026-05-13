import { z } from "zod";
import { UserRoleSchema } from "./users";

export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const IdentityDocumentSchema = z.object({
  type: z.string(), // e.g., "Passport"
  imageUrl: z.string().url(),
  uploadedAt: z.string(),
});
export type IdentityDocument = z.infer<typeof IdentityDocumentSchema>;

export const ApplicantSchema = z.object({
  id: z.string(), // Clerk ID or DB ID
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  roleRequested: UserRoleSchema,
  status: ApprovalStatusSchema,
  identityDocument: IdentityDocumentSchema,
  registeredAt: z.string(), // ISO timestamp
});
export type Applicant = z.infer<typeof ApplicantSchema>;
