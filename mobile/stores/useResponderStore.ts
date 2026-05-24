import { create } from 'zustand';

export type DispatchState = 'idle' | 'dispatch_offered' | 'en_route' | 'on_scene';

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

interface ResponderState {
  status: DispatchState;
  activeDispatch: DispatchDetails | null;
  sceneTimeSeconds: number;
  elapsedTimeSeconds: number;
  
  // Actions
  setStatus: (status: DispatchState) => void;
  setActiveDispatch: (dispatch: DispatchDetails | null) => void;
  incrementSceneTime: () => void;
  incrementElapsedTime: () => void;
  resetTimer: () => void;
  
  // Mock triggers
  simulateIncomingDispatch: () => void;
  acceptDispatch: () => void;
  confirmArrival: () => void;
  completeIncident: () => void;
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
  sceneTimeSeconds: 0,
  elapsedTimeSeconds: 0,

  setStatus: (status) => set({ status }),
  setActiveDispatch: (activeDispatch) => set({ activeDispatch }),
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
    status: 'on_scene',
    sceneTimeSeconds: 0
  }),

  completeIncident: () => set({ 
    status: 'idle', 
    activeDispatch: null,
    sceneTimeSeconds: 0,
    elapsedTimeSeconds: 0
  }),
}));
