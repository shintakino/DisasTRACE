import { create } from 'zustand';

export type DispatchState = 'idle' | 'dispatch_offered' | 'en_route' | 'on_scene' | 'to_hospital' | 'report_filling';

export interface HospitalDetails {
  id: string;
  name: string;
  coordinates: { latitude: number; longitude: number };
  caters: boolean;
}

export interface DispatchDetails {
  id: string;
  type: string; // e.g. "Vehicular Collision"
  locationName: string;
  distance: string; // e.g. "1.7 km"
  natureOfCall: string; // e.g. "EMERGENCY"
  peopleInvolved: number;
  eta: string; // e.g. "~8 min"
  reporterName: string;
  reporterInitials: string;
  timestamp: string; // e.g. "09:43 PM"
  coordinates: {
    latitude: number;
    longitude: number;
  };
  attachmentUrl?: string; // Mock URL
  typeOfEmergency?: string; // e.g. "Medical"
}

export interface DraftForm {
  id: string; // e.g. df-123
  incidentId: string; // matches DispatchDetails.id
  incidentType: string; // e.g. "Fire Emergency"
  lastSaved: string; // e.g. "2 mins ago"
  formData: any; // mock form data payload
}

interface ResponderState {
  status: DispatchState;
  activeDispatch: DispatchDetails | null;
  targetHospital: HospitalDetails | null;
  sceneTimeSeconds: number;
  elapsedTimeSeconds: number;
  isArrivalConfirmVisible: boolean;
  isSubmittingReport: boolean;
  showReportSuccess: boolean;
  
  drafts: DraftForm[];
  submittedIncidentIds: string[];
  
  // Actions
  setStatus: (status: DispatchState) => void;
  setActiveDispatch: (dispatch: DispatchDetails | null) => void;
  setTargetHospital: (hospital: HospitalDetails | null) => void;
  incrementSceneTime: () => void;
  incrementElapsedTime: () => void;
  resetTimer: () => void;
  
  // Mock triggers
  simulateIncomingDispatch: () => void;
  acceptDispatch: () => void;
  confirmArrival: () => void;
  hideArrivalConfirm: () => void;
  arriveAtScene: () => void;
  transportToHospital: () => void;
  startReport: () => void;
  submitReport: (incidentId?: string) => void;
  finishAndClose: () => void;
  completeIncident: () => void;
  
  // Forms & Drafts Actions
  saveDraft: (incident: DispatchDetails, formData: any) => void;
  openFormForIncident: (incident: DispatchDetails) => void;
}

const mockDispatch: DispatchDetails = {
  id: 'DR-2026-0847',
  type: 'Vehicular Collision',
  locationName: 'Brgy. Sabang, Baliwag City',
  distance: '1.7 km',
  natureOfCall: 'Emergency',
  peopleInvolved: 3,
  eta: '~8 min',
  reporterName: 'Eloisa Guibani',
  reporterInitials: 'EG',
  timestamp: '09:43 PM',
  coordinates: {
    latitude: 14.9538,
    longitude: 120.9029,
  },
  typeOfEmergency: 'Medical',
  attachmentUrl: 'https://placehold.co/600x400/1e3a8a/FFF?text=IMG_7904.jpg',
};

export const useResponderStore = create<ResponderState>((set) => ({
  status: 'idle',
  activeDispatch: null,
  targetHospital: null,
  sceneTimeSeconds: 0,
  elapsedTimeSeconds: 0,
  isArrivalConfirmVisible: false,
  isSubmittingReport: false,
  showReportSuccess: false,
  drafts: [
    {
      id: 'df-1',
      incidentId: 'DR-2026-0847',
      incidentType: 'Fire Emergency',
      lastSaved: 'Unsent - Auto-save active',
      formData: {}
    }
  ],
  submittedIncidentIds: ['DR-2026-0841', 'DR-2026-0830', 'DR-2026-0842'], // Based on mock completed/resolved reports

  setStatus: (status) => set({ status }),
  setActiveDispatch: (activeDispatch) => set({ activeDispatch }),
  setTargetHospital: (targetHospital) => set({ targetHospital }),
  incrementSceneTime: () => set((state) => ({ sceneTimeSeconds: state.sceneTimeSeconds + 1 })),
  incrementElapsedTime: () => set((state) => ({ elapsedTimeSeconds: state.elapsedTimeSeconds + 1 })),
  resetTimer: () => set({ sceneTimeSeconds: 0, elapsedTimeSeconds: 0 }),

  simulateIncomingDispatch: () => set({ 
    status: 'dispatch_offered', 
    activeDispatch: mockDispatch 
  }),

  acceptDispatch: () => set({ 
    status: 'en_route',
    elapsedTimeSeconds: 0
  }),

  confirmArrival: () => set({ 
    isArrivalConfirmVisible: true
  }),

  hideArrivalConfirm: () => set({
    isArrivalConfirmVisible: false
  }),

  arriveAtScene: () => set({
    status: 'on_scene',
    isArrivalConfirmVisible: false,
    sceneTimeSeconds: 0
  }),

  transportToHospital: () => set({
    status: 'to_hospital',
    targetHospital: null, // Reset so it can be dynamically chosen
    elapsedTimeSeconds: 0
  }),

  startReport: () => set({
    status: 'report_filling'
  }),

  submitReport: (incidentId?: string) => {
    set({ isSubmittingReport: true });
    setTimeout(() => {
      set((state) => {
        const idToSubmit = incidentId || state.activeDispatch?.id;
        if (!idToSubmit) return { isSubmittingReport: false, showReportSuccess: true };
        
        return {
          isSubmittingReport: false,
          showReportSuccess: true,
          submittedIncidentIds: [...state.submittedIncidentIds, idToSubmit],
          drafts: state.drafts.filter(d => d.incidentId !== idToSubmit)
        };
      });
    }, 2000);
  },

  finishAndClose: () => set({
    status: 'idle', 
    activeDispatch: null,
    targetHospital: null,
    sceneTimeSeconds: 0,
    elapsedTimeSeconds: 0,
    isArrivalConfirmVisible: false,
    isSubmittingReport: false,
    showReportSuccess: false
  }),

  completeIncident: () => set({ 
    status: 'idle', 
    activeDispatch: null,
    targetHospital: null,
    sceneTimeSeconds: 0,
    elapsedTimeSeconds: 0,
    isArrivalConfirmVisible: false,
    isSubmittingReport: false,
    showReportSuccess: false
  }),

  saveDraft: (incident, formData) => set((state) => {
    const existingDraftIndex = state.drafts.findIndex(d => d.incidentId === incident.id);
    const newDraft: DraftForm = {
      id: existingDraftIndex >= 0 ? state.drafts[existingDraftIndex].id : `df-${Date.now()}`,
      incidentId: incident.id,
      incidentType: incident.typeOfEmergency || incident.type,
      lastSaved: 'Unsent - Auto-save active',
      formData
    };

    if (existingDraftIndex >= 0) {
      const newDrafts = [...state.drafts];
      newDrafts[existingDraftIndex] = newDraft;
      return { drafts: newDrafts };
    }
    return { drafts: [...state.drafts, newDraft] };
  }),

  openFormForIncident: (incident) => set({
    activeDispatch: incident,
    status: 'report_filling'
  })
}));
