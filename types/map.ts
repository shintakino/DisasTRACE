import { z } from "zod";

export const IncidentStatusSchema = z.enum(["NEW", "ONGOING", "COMPLETED", "STANDBY"]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const MapIncidentSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  vehicleId: z.string().optional(),
  status: IncidentStatusSchema,
  type: z.string(),
  origin: z.string(),
  destination: z.string(),
  lat: z.number(),
  lng: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MapIncident = z.infer<typeof MapIncidentSchema>;

export const ResponderStatusSchema = z.enum(["AVAILABLE", "DISPATCHED", "OFF_DUTY"]);
export type ResponderStatus = z.infer<typeof ResponderStatusSchema>;

export const MapResponderSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  status: ResponderStatusSchema,
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  lastUpdated: z.string(),
});
export type MapResponder = z.infer<typeof MapResponderSchema>;

export const MapSummarySchema = z.object({
  new: z.number(),
  ongoing: z.number(),
  completed: z.number(),
  standby: z.number(),
});
export type MapSummary = z.infer<typeof MapSummarySchema>;
