import { z } from "zod";

export const IncidentStatusSchema = z.enum([
  "NEW", "ONGOING", "COMPLETED", "STANDBY",
  "PENDING", "VERIFIED", "REJECTED", "DUPLICATE"
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const MapIncidentSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  vehicleId: z.string().optional(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  nature: z.enum(["EMERGENCY", "NON-EMERGENCY"]),
  status: IncidentStatusSchema,
  type: z.string(),
  origin: z.string(),
  destination: z.string(),
  barangay: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  category: z.enum(["user", "responder"]),
  submittedDate: z.string().optional(),
  submittedTime: z.string().optional(),
  lastUpdated: z.string().optional(),
  reporterName: z.string().optional().nullable(),
  reporterPhone: z.string().optional().nullable(),
});
export type MapIncident = z.infer<typeof MapIncidentSchema>;

export const ResponderStatusSchema = z.enum(["AVAILABLE", "DISPATCHED", "OFF_DUTY"]);
export type ResponderStatus = z.infer<typeof ResponderStatusSchema>;

export const MapResponderSchema = z.object({
  id: z.string(),
  responderName: z.string(),
  vehicleId: z.string(),
  status: ResponderStatusSchema,
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  lastUpdated: z.string(),
  activeIncidentId: z.string().optional(),
});
export type MapResponder = z.infer<typeof MapResponderSchema>;

export const MapSummarySchema = z.object({
  new: z.number(),
  ongoing: z.number(),
  completed: z.number(),
  standby: z.number(),
});
export type MapSummary = z.infer<typeof MapSummarySchema>;

export const DemandZoneRiskSchema = z.enum(["EMERGING", "MODERATE", "HIGH"]);
export type DemandZoneRisk = z.infer<typeof DemandZoneRiskSchema>;

export const MapDemandZoneSchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  count: z.number().int().nonnegative(),
  riskLevel: DemandZoneRiskSchema,
});
export type MapDemandZone = z.infer<typeof MapDemandZoneSchema>;

export const MapHospitalSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  caters: z.boolean().default(true).optional(),
  phone: z.string().optional().nullable(),
});
export type MapHospital = z.infer<typeof MapHospitalSchema>;
