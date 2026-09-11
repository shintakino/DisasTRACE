import { z } from 'zod';
import { create } from 'zustand';

// Strictly typed report validation schema
export const EmergencyReportSchema = z.object({
  id: z.string().optional(), // Server-generated Request ID
  requestId: z.string().optional(), // Human-readable Request ID (e.g., REQ-2026-XXXX)
  incidentId: z.string().optional(), // Server-generated Incident ID
  trackingRequestId: z.string().optional(), // Canonical request ID when this report is merged as a duplicate
  photoUri: z.string().min(1, "Photo URI is invalid").optional(),
  incidentType: z.enum([
    "Medical Emergency",
    "Vehicular Collision",
    "Fire Emergency",
    "Structural Failure",
    "Flood/Water",
    "Unknown Cause",
    "Patient Transport",
    "Other / non-emergency request"
  ], { required_error: "Please select the type of emergency" }),
  peopleInvolved: z.union([
    z.enum(["None", "1-2 Persons", "3-5 Persons", "6+ Persons"]),
    z.string().regex(/^[1-9]\d{0,2} Persons?$/, "Please provide one exact count from 1 to 999"),
  ], { required_error: "Please specify number of participants" }),
  landmarks: z.string().max(150, "Description must not exceed 150 characters").optional(),
  latitude: z.number(),
  longitude: z.number(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  nature: z.enum(["Emergency", "Non-emergency"]).optional(),
  totalDurationSeconds: z.number().optional(),
  responderFullName: z.string().optional(),
  responderVehicleId: z.string().optional(),
  isMergedDuplicate: z.boolean().optional(),
  reporterMode: z.enum(['guest', 'resident']).optional(),
  guestAccessToken: z.string().optional(),
  triageClassification: z.enum(['HIGH_CONFIDENCE_EMERGENCY', 'HIGH_CONFIDENCE_NON_EMERGENCY', 'UNCERTAIN_INCOMPLETE', 'SUSPICIOUS_POSSIBLE_PRANK']).optional(),
  victimCondition: z.enum([
    'Conscious and stable',
    'Conscious and unstable',
    'Unconscious / critical',
    'No injuries reported',
    'Unknown / cannot assess',
  ]).optional(),
  chatbotOrigin: z.boolean().optional(),
  chatbotSubmissionId: z.string().uuid().optional(),
});

export type EmergencyReportType = z.infer<typeof EmergencyReportSchema>;

interface EmergencyReportStore {
  report: Partial<EmergencyReportType>;
  setPhotoUri: (uri: string) => void;
  setDetails: (details: Partial<Omit<EmergencyReportType, 'photoUri'>>) => void;
  resetReport: () => void;
}

export const useEmergencyReportStore = create<EmergencyReportStore>((set) => ({
  report: {},
  setPhotoUri: (uri) => set((state) => ({ report: { ...state.report, photoUri: uri } })),
  setDetails: (details) => set((state) => ({ report: { ...state.report, ...details } })),
  resetReport: () => set({ report: {} }),
}));
