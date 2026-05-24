import { z } from 'zod';
import { create } from 'zustand';

// Strictly typed report validation schema
export const EmergencyReportSchema = z.object({
  id: z.string().optional(), // Server-generated Request ID
  photoUri: z.string().min(1, "Live photo is required"),
  incidentType: z.enum([
    "Medical Emergency",
    "Vehicular Collision",
    "Fire Emergency",
    "Structural Failure",
    "Flood/Water",
    "Unknown Cause"
  ], { required_error: "Please select the type of emergency" }),
  peopleInvolved: z.enum(["None", "1-2 Persons", "3-5 Persons", "6+ Persons"], {
    required_error: "Please specify number of participants"
  }),
  landmarks: z.string().max(150, "Description must not exceed 150 characters").optional(),
  latitude: z.number(),
  longitude: z.number(),
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
