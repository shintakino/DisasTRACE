import { z } from "zod";
import { IncidentTypeSchema } from "./reports"; // Reuse existing enum

export const VerificationStatusSchema = z.enum(["PENDING", "VERIFIED", "REJECTED"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const IncidentNatureSchema = z.enum(["EMERGENCY", "NON-EMERGENCY"]);
export type IncidentNature = z.infer<typeof IncidentNatureSchema>;

export const ResidentInfoSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  priorReports: z.number(),
  isVerified: z.boolean(),
});
export type ResidentInfo = z.infer<typeof ResidentInfoSchema>;

export const VerificationIncidentSchema = z.object({
  id: z.string(),
  status: z.enum(['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED']),
  responderId: z.string().nullable().optional(),
  currentOfferResponderId: z.string().nullable().optional(),
  dispatchMethod: z.string().nullable().optional(),
}).nullable().optional();

export const VerificationRequestSchema = z.object({
  id: z.string(),
  requestId: z.string(), // e.g., REQ-2026-0047
  status: VerificationStatusSchema,
  nature: IncidentNatureSchema,
  type: IncidentTypeSchema,
  location: z.string(),
  peopleInvolved: z.number(),
  imageUrl: z.string().url().optional(),
  receivedAt: z.string(), // ISO timestamp
  resident: ResidentInfoSchema,
  incident: VerificationIncidentSchema,
});
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;
