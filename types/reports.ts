import { z } from "zod";

export const ReportStatusSchema = z.enum(["COMPLETED", "ONGOING", "RESPONDING"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const IncidentTypeSchema = z.enum([
  "Fire Emergency",
  "Vehicular Collision",
  "Medical Emergency",
  "Structural Failure",
  "Flood/Water",
  "Unknown Cause",
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const ReportEntrySchema = z.object({
  id: z.string(), // Case ID
  responderName: z.string(),
  type: IncidentTypeSchema,
  status: ReportStatusSchema,
  date: z.string(), // e.g., "21 March 2026"
  time: z.string(), // e.g., "09:43 AM"
  location: z.string(),
});
export type ReportEntry = z.infer<typeof ReportEntrySchema>;

export const ReportFilterSchema = z.object({
  search: z.string().optional(),
  type: IncidentTypeSchema.optional(),
  status: ReportStatusSchema.optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});
export type ReportFilter = z.infer<typeof ReportFilterSchema>;

export const DispatchInfoSchema = z.object({
  date: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  hqDprtTime: z.string().optional().nullable(),
  hqArrTime: z.string().optional().nullable(),
  sceneDprtTime: z.string().optional().nullable(),
  sceneArrTime: z.string().optional().nullable(),
  hospitalDprtTime: z.string().optional().nullable(),
  hospitalArrTime: z.string().optional().nullable(),
});

export const EmergencyTypeSchema = z.object({
  callType: z.string().optional().nullable(),
  arrivalPerson: z.string().optional().nullable(),
});

export const IncidentInfoSchema = z.object({
  siteOfIncident: z.string().optional().nullable(),
  chiefComplaints: z.string().optional().nullable(),
});

export const InitialAssessmentSchema = z.object({
  loc: z.string().optional().nullable(),
  spinalInjury: z.string().optional().nullable(),
  circulation: z.object({
    pulse: z.string().optional().nullable(),
    pulseQuality: z.string().optional().nullable(),
    bleeding: z.string().optional().nullable(),
    bleedingLocation: z.string().optional().nullable(),
    controlled: z.string().optional().nullable(),
    bleedingControlMethod: z.string().optional().nullable(),
  }).optional().nullable(),
  airway: z.object({
    status: z.string().optional().nullable(),
    intervention: z.string().optional().nullable(),
  }).optional().nullable(),
  trachea: z.string().optional().nullable(),
  breathing: z.object({
    status: z.string().optional().nullable(),
    breathSounds: z.string().optional().nullable(),
    oxygen: z.string().optional().nullable(),
    lpm: z.string().optional().nullable(),
    delivery: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const VitalLogSchema = z.object({
  time: z.string().optional().nullable(),
  bp: z.string().optional().nullable(),
  pr: z.string().optional().nullable(),
  o2_sat: z.string().optional().nullable(),
  rr: z.string().optional().nullable(),
  temp: z.string().optional().nullable(),
  pupil: z.string().optional().nullable(),
  skin: z.string().optional().nullable(),
});

export const PainAssessmentSchema = z.object({
  location: z.string().optional().nullable(),
  onset: z.string().optional().nullable(),
  provocation: z.string().optional().nullable(),
  quality: z.string().optional().nullable(),
  radiation: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  time: z.string().optional().nullable(),
});

export const SampleHistorySchema = z.object({
  allergies: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  pastMedicalHistory: z.string().optional().nullable(),
  lastOralIntake: z.string().optional().nullable(),
  eventsLeadingToInjury: z.string().optional().nullable(),
});

export const HandoffSignaturesSchema = z.object({
  accomplishedBy: z.string().optional().nullable(),
  accomplishedByLicense: z.string().optional().nullable(),
  receivingHospital: z.string().optional().nullable(),
  referredTo: z.string().optional().nullable(),
  referredToLicense: z.string().optional().nullable(),
  receivingPhysician: z.string().optional().nullable(),
  receivingPhysicianLicense: z.string().optional().nullable(),
  licenseNo: z.string().optional().nullable(),
  arrivalTime: z.string().optional().nullable(),
});

export const LiabilityReleaseSchema = z.object({
  refused: z.boolean().optional().nullable(),
  refusalType: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
  witnessedBy: z.string().optional().nullable(),
  witnessAddress: z.string().optional().nullable(),
});

export const RespondingTeamSchema = z.object({
  teamLeader: z.string().optional().nullable(),
  teamMembers: z.string().optional().nullable(),
  driver: z.string().optional().nullable(),
});

export const PatientCareReportPayloadSchema = z.object({
  id: z.string().optional().nullable(),
  patientName: z.string(),
  patientAddress: z.string().optional().nullable(),
  patientContact: z.string().optional().nullable(),
  patientAge: z.number().optional().nullable(),
  patientGender: z.string().optional().nullable(),
  dispatchInfo: DispatchInfoSchema.optional().nullable(),
  emergencyType: EmergencyTypeSchema.optional().nullable(),
  incidentInfo: IncidentInfoSchema.optional().nullable(),
  initialAssessment: InitialAssessmentSchema.optional().nullable(),
  vitalsLogs: z.array(VitalLogSchema).optional().nullable(),
  painAssessment: PainAssessmentSchema.optional().nullable(),
  gcsPoints: z.number().optional().nullable(),
  sampleHistory: SampleHistorySchema.optional().nullable(),
  traumaMarkers: z.array(z.string()).optional().nullable(),
  narrativeReport: z.string().optional().nullable(),
  handoffSignatures: HandoffSignaturesSchema.optional().nullable(),
  liabilityRelease: LiabilityReleaseSchema.optional().nullable(),
  respondingTeam: RespondingTeamSchema.optional().nullable(),
});

export const TripLogSchema = z.object({
  departureOffice: z.string().optional().nullable(),
  arrivalScene: z.string().optional().nullable(),
  departureScene: z.string().optional().nullable(),
  arrivalOffice: z.string().optional().nullable(),
  distance: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
});

export const GasolineConsumedSchema = z.object({
  balance: z.string().optional().nullable(),
  issued: z.string().optional().nullable(),
  purchase: z.string().optional().nullable(),
  total: z.string().optional().nullable(),
  deduction: z.string().optional().nullable(),
  balanceEnd: z.string().optional().nullable(),
});

export const LubricantsSchema = z.object({
  carOil: z.string().optional().nullable(),
  lubeOil: z.string().optional().nullable(),
  grease: z.string().optional().nullable(),
});

export const SpeedometerSchema = z.object({
  beginning: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const SignaturesSchema = z.object({
  driverPhone: z.string().optional().nullable(),
  driverSignature: z.string().optional().nullable(),
  authorizedRepSignature: z.string().optional().nullable(),
});

export const DriverTripTicketPayloadSchema = z.object({
  id: z.string().optional().nullable(),
  driverName: z.string(),
  vehiclePlate: z.string(),
  passengerName: z.string().optional().nullable(),
  placesVisited: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  tripLog: TripLogSchema.optional().nullable(),
  gasolineConsumed: GasolineConsumedSchema.optional().nullable(),
  lubricants: LubricantsSchema.optional().nullable(),
  speedometer: SpeedometerSchema.optional().nullable(),
  remarks: z.string().optional().nullable(),
  signatures: SignaturesSchema.optional().nullable(),
});

export const DetailedIncidentReportSchema = z.object({
  id: z.string(),
  responderName: z.string(),
  vehicleId: z.string(),
  type: IncidentTypeSchema,
  status: ReportStatusSchema,
  date: z.string(),
  time: z.string(),
  location: z.string(),
  description: z.string().optional(), // keeping for backward compatibility if needed
  residentReportDescription: z.string().optional(),
  residentPhotoUrl: z.string().optional(),
  crewFindings: z.string().optional(),
  natureOfCall: z.string().optional(),
  severityLevel: z.string().optional(),
  peopleInvolved: z.number().optional(),
  residentPeopleInvolved: z.number().optional(),
  scenePhotos: z.array(z.string()), // URLs to Supabase Storage
  logs: z.array(
    z.object({
      action: z.string(),
      time: z.string(),
    })
  ),
  participants: z.array(
    z.object({
      name: z.string(),
      contact: z.string(),
      triageStatus: z.string(),
    })
  ).optional(),
  residentName: z.string().optional(),
  residentPhone: z.string().optional(),
  residentAddress: z.string().optional(),
  patientCareReports: z.array(PatientCareReportPayloadSchema).optional(),
  driverTripTicket: DriverTripTicketPayloadSchema.optional().nullable(),
});
export type DetailedIncidentReport = z.infer<typeof DetailedIncidentReportSchema>;
