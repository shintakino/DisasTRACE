import { z } from "zod";

const OptionalPhoneStringSchema = z.string().refine(
  (value) => value === '' || /^09\d{9}$/.test(value),
  'Phone number must contain 11 digits and start with 09',
);
const OptionalBloodPressureStringSchema = z.string().refine((value) => {
  if (value === '') return true;
  const match = /^(\d{1,3})\/(\d{1,3})$/.exec(value);
  return Boolean(match && Number(match[1]) >= 1 && Number(match[1]) <= 300 && Number(match[2]) >= 1 && Number(match[2]) <= 300);
}, 'Blood pressure must use the format 120/80');
const optionalIntegerString = (min: number, max: number) => z.string().refine((value) => {
  if (value === '') return true;
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max;
}, `Value must be a whole number from ${min} to ${max}`);
const optionalDecimalString = (min = 0, max = 999999.99) => z.string().refine((value) => {
  if (value === '') return true;
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) >= min && Number(value) <= max;
}, `Value must be a number from ${min} to ${max}`);

export const ReportStatusSchema = z.enum(["COMPLETED", "ONGOING", "RESPONDING"]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const IncidentTypeSchema = z.enum([
  "Fire Emergency",
  "Vehicular Collision",
  "Medical Emergency",
  "Structural Failure",
  "Flood/Water",
  "Unknown Cause",
  "Patient Transport",
  "Other / non-emergency request",
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

export const DatePresetSchema = z.enum(["all", "today", "this_week", "this_month", "this_year"]);
export type DatePreset = z.infer<typeof DatePresetSchema>;

export const ReportFilterSchema = z.object({
  search: z.string().optional(),
  type: IncidentTypeSchema.optional(),
  status: ReportStatusSchema.optional(),
  datePreset: DatePresetSchema.optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});
export type ReportFilter = z.infer<typeof ReportFilterSchema>;

export const ReporterSourceSchema = z.enum(['all', 'registered', 'guest']);
export type ReporterSource = z.infer<typeof ReporterSourceSchema>;

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
    lpm: optionalDecimalString(0, 25).optional().nullable(),
    delivery: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const VitalLogSchema = z.object({
  time: z.string().optional().nullable(),
  bp: OptionalBloodPressureStringSchema.optional().nullable(),
  pr: optionalIntegerString(1, 300).optional().nullable(),
  o2_sat: optionalIntegerString(1, 100).optional().nullable(),
  rr: optionalIntegerString(1, 200).optional().nullable(),
  temp: optionalDecimalString(20, 50).optional().nullable(),
  pupil: z.string().optional().nullable(),
  skin: z.string().optional().nullable(),
});

export const PainAssessmentSchema = z.object({
  location: z.string().optional().nullable(),
  onset: z.string().optional().nullable(),
  provocation: z.string().optional().nullable(),
  quality: z.string().optional().nullable(),
  radiation: z.string().optional().nullable(),
  severity: optionalIntegerString(0, 10).optional().nullable(),
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
  accomplishedBySignature: z.string().optional().nullable(),
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
  patientSignature: z.string().optional().nullable(),
  witnessSignature: z.string().optional().nullable(),
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
  patientName: z.string().trim().min(1).max(255),
  patientAddress: z.string().optional().nullable(),
  patientContact: OptionalPhoneStringSchema.optional().nullable(),
  patientAge: z.number().int().min(0).max(130).optional().nullable(),
  patientGender: z.string().optional().nullable(),
  dispatchInfo: DispatchInfoSchema.optional().nullable(),
  emergencyType: EmergencyTypeSchema.optional().nullable(),
  incidentInfo: IncidentInfoSchema.optional().nullable(),
  initialAssessment: InitialAssessmentSchema.optional().nullable(),
  vitalsLogs: z.array(VitalLogSchema).optional().nullable(),
  painAssessment: PainAssessmentSchema.optional().nullable(),
  gcsPoints: z.number().int().min(3).max(15).optional().nullable(),
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
  distance: optionalDecimalString().optional().nullable(),
  date: z.string().optional().nullable(),
});

export const GasolineConsumedSchema = z.object({
  balance: optionalDecimalString().optional().nullable(),
  issued: optionalDecimalString().optional().nullable(),
  purchase: optionalDecimalString().optional().nullable(),
  total: optionalDecimalString().optional().nullable(),
  deduction: optionalDecimalString().optional().nullable(),
  balanceEnd: optionalDecimalString().optional().nullable(),
});

export const LubricantsSchema = z.object({
  carOil: optionalDecimalString().optional().nullable(),
  lubeOil: optionalDecimalString().optional().nullable(),
  grease: optionalDecimalString().optional().nullable(),
});

export const SpeedometerSchema = z.object({
  beginning: optionalDecimalString().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const SignaturesSchema = z.object({
  driverPhone: OptionalPhoneStringSchema.optional().nullable(),
  driverSignature: z.string().optional().nullable(),
  passengerSignature: z.string().optional().nullable(),
  authorizedRepSignature: z.string().optional().nullable(),
});

export const DriverTripTicketPayloadSchema = z.object({
  id: z.string().optional().nullable(),
  date: z.string().trim().min(1).max(50),
  driverName: z.string().trim().min(1).max(255),
  vehiclePlate: z.string().trim().min(1).max(50),
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
  peopleInvolved: z.number().int().min(0).max(999).optional(),
  residentPeopleInvolved: z.number().int().min(0).max(999).optional(),
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
