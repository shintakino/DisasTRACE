import { z } from "zod";
import { IncidentTypeSchema } from "./reports"; // Reuse existing enum

export const VerificationStatusSchema = z.enum(["PENDING", "VERIFIED", "REJECTED", "DUPLICATE"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const IncidentNatureSchema = z.enum(["EMERGENCY", "NON-EMERGENCY"]);
export type IncidentNature = z.infer<typeof IncidentNatureSchema>;

export const IncidentSeveritySchema = z.enum(["Low", "Medium", "High", "Critical"]);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

/**
 * Server-authoritative incident lifecycle. Keep dashboard, verification, and
 * responder views aligned when a responder safely defers final documentation.
 */
export const IncidentStatusSchema = z.enum(['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'DOCUMENTATION_PENDING', 'RESOLVED']);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const TriageClassificationSchema = z.enum(['HIGH_CONFIDENCE_EMERGENCY', 'HIGH_CONFIDENCE_NON_EMERGENCY', 'UNCERTAIN_INCOMPLETE', 'SUSPICIOUS_POSSIBLE_PRANK']);
export type TriageClassification = z.infer<typeof TriageClassificationSchema>;

export const ResidentInfoSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  priorReports: z.number(),
  isVerified: z.boolean(),
  reliabilityScore: z.number().optional(),
});
export type ResidentInfo = z.infer<typeof ResidentInfoSchema>;

export const VerificationIncidentSchema = z.object({
  id: z.string(),
  status: IncidentStatusSchema,
  responderId: z.string().nullable().optional(),
  currentOfferResponderId: z.string().nullable().optional(),
  offerExpiresAt: z.string().nullable().optional(),
  dispatchMethod: z.string().nullable().optional(),
}).nullable().optional();

export const RelatedVerificationReportSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  status: VerificationStatusSchema,
  relation: z.enum(['LINKED', 'PACC_REVIEW']),
  receivedAt: z.string(),
  reporterName: z.string(),
  contactNumber: z.string(),
  location: z.string(),
  imageUrl: z.string().url().optional(),
});

export const VerificationRequestSchema = z.object({
  id: z.string(),
  requestId: z.string(), // e.g., REQ-2026-0047
  status: VerificationStatusSchema,
  triageClassification: TriageClassificationSchema,
  triageReasons: z.array(z.string()),
  rejectionReason: z.string().nullable().optional(),
  coordinationAgencies: z.array(z.string()),
  reporterType: z.enum(['REGISTERED', 'GUEST']),
  nature: IncidentNatureSchema,
  severity: IncidentSeveritySchema,
  type: IncidentTypeSchema,
  location: z.string(),
  peopleInvolved: z.number(),
  imageUrl: z.string().url().optional(),
  photoLatitude: z.number().finite().min(-90).max(90).optional(),
  photoLongitude: z.number().finite().min(-180).max(180).optional(),
  receivedAt: z.string(), // ISO timestamp
  resident: ResidentInfoSchema,
  incident: VerificationIncidentSchema,
  requiresPaccReassignment: z.boolean().optional(),
  relatedReports: z.array(RelatedVerificationReportSchema).default([]),
});
export type VerificationRequest = z.infer<typeof VerificationRequestSchema>;
