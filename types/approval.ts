import { z } from "zod";
import { UserRoleSchema } from "./users";

export const ApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const IdentityDocumentSchema = z.object({
  type: z.string(), // e.g., "Passport"
  imageUrl: z.string().url(),
  documentPath: z.string().trim().min(1).max(512),
  uploadedAt: z.string(),
});
export type IdentityDocument = z.infer<typeof IdentityDocumentSchema>;

export const ApplicantSchema = z.object({
  id: z.string(), // Supabase Auth ID (UUID)
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  barangay: z.string(),
  roleRequested: UserRoleSchema,
  status: ApprovalStatusSchema,
  identityDocument: IdentityDocumentSchema,
  registeredAt: z.string(), // ISO timestamp
});
export type Applicant = z.infer<typeof ApplicantSchema>;

export type IncompleteApplicant = Pick<Applicant,
  "id" | "fullName" | "email" | "phone" | "registeredAt"
>;

export const VerificationActionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  documentPath: z.string().trim().min(1).max(512),
  reason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.status === 'REJECTED' && !value.reason) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'Provide a reason for rejecting this registration.' });
  }
});
export type VerificationAction = z.infer<typeof VerificationActionSchema>;
