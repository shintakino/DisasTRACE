import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

export type DispatchState = 'idle' | 'dispatch_offered' | 'en_route' | 'on_scene' | 'to_hospital' | 'report_filling';

export interface QueueAction {
  id: string; // unique timestamp/uuid
  type: 'STATE_CHANGE' | 'TELEMETRY_SYNC';
  timestamp: string; // ISO string
  endpoint: string; // target endpoint
  method: 'POST' | 'PATCH' | 'PUT';
  payload: any;
}

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
  dispatchOfferDurationSeconds?: number; // Configurable duration in seconds
  assignedAmbulance?: string; // e.g. "AMB-001"
}

export interface DraftForm {
  id: string; // e.g. df-123
  incidentId: string; // matches DispatchDetails.id
  incidentType: string; // e.g. "Fire Emergency"
  lastSaved: string; // e.g. "2 mins ago"
  formData: any; // mock form data payload
  incidentDetails?: DispatchDetails; // Cache full incident context for draft recovery
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
  currentSpeedKph: number;
  hospitalDistanceKm: number | null;
  hospitalEtaMins: number | null;
  lastSubmittedSummary: {
    responseTimeMins: number;
    patientsCount: number;
    distanceKm: number;
  } | null;
  
  drafts: DraftForm[];
  submittedIncidentIds: string[];
  offlineQueue: QueueAction[];
  isSyncingQueue: boolean;
  
  // Actions
  setStatus: (status: DispatchState) => void;
  setActiveDispatch: (dispatch: DispatchDetails | null) => void;
  setTargetHospital: (hospital: HospitalDetails | null) => void;
  setHospitalRouteMetrics: (distanceKm: number | null, etaMins: number | null) => void;
  incrementSceneTime: () => void;
  incrementElapsedTime: () => void;
  resetTimer: () => void;
  
  // Actions
  acceptDispatch: () => void;
  confirmArrival: () => void;
  hideArrivalConfirm: () => void;
  arriveAtScene: () => Promise<void>;
  transportToHospital: () => void;
  startReport: () => Promise<void>;
  submitReport: (incidentId?: string, formData?: any) => Promise<void>;
  finishAndClose: () => void;
  completeIncident: () => void;
  
  // Forms & Drafts Actions
  saveDraft: (incident: DispatchDetails, formData: any) => void;
  openFormForIncident: (incident: DispatchDetails) => void;

  enqueueAction: (action: Omit<QueueAction, 'id' | 'timestamp'>) => Promise<void>;
  dequeueAction: (id: string) => Promise<void>;
  loadOfflineQueue: () => Promise<void>;
  setSyncingQueue: (isSyncing: boolean) => void;
}

// Promise chain to serialize asynchronous writes to SecureStore and avoid race conditions
let writePromiseChain = Promise.resolve();

const serializeSecureStoreWrite = (queue: QueueAction[]) => {
  writePromiseChain = writePromiseChain.then(async () => {
    try {
      await SecureStore.setItemAsync('disas_trace_offline_state_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('[SecureStore] Failed to write offline queue:', e);
    }
  });
  return writePromiseChain;
};

export const checkConnectivity = async (): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('https://clients3.google.com/generate_204', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return response.status === 204 || response.ok;
  } catch (e) {
    clearTimeout(timeoutId);
    return false;
  }
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
  currentSpeedKph: 0,
  hospitalDistanceKm: null,
  hospitalEtaMins: null,
  lastSubmittedSummary: null,
  drafts: [],
  submittedIncidentIds: [],
  offlineQueue: [],
  isSyncingQueue: false,

  setStatus: (status) => set({ status }),
  setActiveDispatch: (activeDispatch) => set({ activeDispatch }),
  setTargetHospital: (targetHospital) => set({ targetHospital }),
  setHospitalRouteMetrics: (hospitalDistanceKm, hospitalEtaMins) => set({ hospitalDistanceKm, hospitalEtaMins }),
  incrementSceneTime: () => set((state) => ({ sceneTimeSeconds: state.sceneTimeSeconds + 1 })),
  incrementElapsedTime: () => set((state) => ({ elapsedTimeSeconds: state.elapsedTimeSeconds + 1 })),
  resetTimer: () => set({ sceneTimeSeconds: 0, elapsedTimeSeconds: 0 }),

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

  arriveAtScene: async () => {
    const activeDispatch = useResponderStore.getState().activeDispatch;
    if (activeDispatch) {
      let isOnline = false;
      try {
        isOnline = await checkConnectivity();
      } catch (err) {
        isOnline = false;
      }

      let dbSuccess = false;
      if (isOnline) {
        try {
          const { error } = await supabase
            .from('incidents')
            .update({ status: 'ARRIVED' })
            .eq('id', activeDispatch.id);
          if (error) throw error;
          dbSuccess = true;
          console.log('[useResponderStore] Successfully updated status to ARRIVED in DB.');
        } catch (e) {
          console.error('[useResponderStore] Failed to update incident status to ARRIVED (treating as offline):', e);
        }
      }

      if (!isOnline || !dbSuccess) {
        console.log('[useResponderStore] ArriveAtScene offline path triggered. Queuing STATE_CHANGE.');
        await useResponderStore.getState().enqueueAction({
          type: 'STATE_CHANGE',
          endpoint: '/api/incidents/status',
          method: 'POST',
          payload: { incidentId: activeDispatch.id, status: 'ARRIVED' }
        });
      }
    }
    set({
      status: 'on_scene',
      isArrivalConfirmVisible: false,
      sceneTimeSeconds: 0
    });
  },

  transportToHospital: () => set({
    status: 'to_hospital',
    targetHospital: null, // Reset so it can be dynamically chosen
    elapsedTimeSeconds: 0
  }),

  startReport: async () => {
    const activeDispatch = useResponderStore.getState().activeDispatch;
    const resolvedAt = new Date().toISOString();
    if (activeDispatch) {
      let isOnline = false;
      try {
        isOnline = await checkConnectivity();
      } catch (err) {
        isOnline = false;
      }

      let dbSuccess = false;
      if (isOnline) {
        try {
          const { error } = await supabase
            .from('incidents')
            .update({ status: 'RESOLVED', resolved_at: resolvedAt })
            .eq('id', activeDispatch.id);
          if (error) throw error;
          dbSuccess = true;
          console.log('[useResponderStore] Successfully updated status to RESOLVED in DB (on-scene resolution).');
        } catch (e) {
          console.error('[useResponderStore] Failed to update incident status to RESOLVED (treating as offline):', e);
        }
      }

      if (!isOnline || !dbSuccess) {
        console.log('[useResponderStore] StartReport offline path triggered. Queuing STATE_CHANGE.');
        await useResponderStore.getState().enqueueAction({
          type: 'STATE_CHANGE',
          endpoint: '/api/incidents/status',
          method: 'POST',
          payload: { incidentId: activeDispatch.id, status: 'RESOLVED', resolvedAt }
        });
      }
    }
    set({
      status: 'report_filling'
    });
  },

  submitReport: async (incidentId?: string, formData?: any) => {
    set({ isSubmittingReport: true });
    const idToSubmit = incidentId || useResponderStore.getState().activeDispatch?.id;
    if (!idToSubmit) {
      set({ isSubmittingReport: false, showReportSuccess: true });
      return;
    }

    const activeDispatch = useResponderStore.getState().activeDispatch;
    const elapsedTimeSeconds = useResponderStore.getState().elapsedTimeSeconds;
    
    // Parse distance from activeDispatch.distance (e.g. "1.7 km" or similar)
    let parsedDistance = 1.7;
    if (activeDispatch?.distance) {
      const match = activeDispatch.distance.match(/[\d.]+/);
      if (match) parsedDistance = parseFloat(match[0]);
    }

    const summary = {
      responseTimeMins: Math.ceil(elapsedTimeSeconds / 60) || 9,
      patientsCount: formData?.patients?.length || 1,
      distanceKm: parsedDistance,
    };

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();
      const reqHeaders: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiUrl}/api/reports`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          incidentId: idToSubmit,
          description: formData?.description || 'Incident resolved.',
          scenePhotos: formData?.scenePhotos || [],
          participants: formData?.patients || [],
        })
      });

      const res = await response.json();
      if (res.success) {
        set((state) => ({
          isSubmittingReport: false,
          showReportSuccess: true,
          lastSubmittedSummary: summary,
          submittedIncidentIds: [...state.submittedIncidentIds, idToSubmit],
          drafts: state.drafts.filter(d => d.incidentId !== idToSubmit)
        }));
      } else {
        console.error('Failed to submit report:', res.error);
        alert(res.error || 'Failed to submit report.');
        set({ isSubmittingReport: false });
      }
    } catch (err) {
      console.error('Error submitting report to API, queuing offline:', err);
      
      // Enqueue report submission action to the offline queue for auto-replay
      await useResponderStore.getState().enqueueAction({
        type: 'STATE_CHANGE',
        endpoint: '/api/reports',
        method: 'POST',
        payload: {
          incidentId: idToSubmit,
          description: formData?.description || 'Incident resolved.',
          scenePhotos: formData?.scenePhotos || [],
          participants: formData?.patients || [],
        }
      });

      set((state) => ({
        isSubmittingReport: false,
        showReportSuccess: true,
        lastSubmittedSummary: summary,
        submittedIncidentIds: [...state.submittedIncidentIds, idToSubmit],
        drafts: state.drafts.filter(d => d.incidentId !== idToSubmit)
      }));
    }
  },

  finishAndClose: () => set({
    status: 'idle', 
    activeDispatch: null,
    targetHospital: null,
    sceneTimeSeconds: 0,
    elapsedTimeSeconds: 0,
    isArrivalConfirmVisible: false,
    isSubmittingReport: false,
    showReportSuccess: false,
    currentSpeedKph: 0,
    hospitalDistanceKm: null,
    hospitalEtaMins: null,
    lastSubmittedSummary: null
  }),

  completeIncident: () => set({ 
    status: 'idle', 
    activeDispatch: null,
    targetHospital: null,
    sceneTimeSeconds: 0,
    elapsedTimeSeconds: 0,
    isArrivalConfirmVisible: false,
    isSubmittingReport: false,
    showReportSuccess: false,
    currentSpeedKph: 0,
    hospitalDistanceKm: null,
    hospitalEtaMins: null,
    lastSubmittedSummary: null
  }),

  saveDraft: (incident, formData) => set((state) => {
    const existingDraftIndex = state.drafts.findIndex(d => d.incidentId === incident.id);
    const newDraft: DraftForm = {
      id: existingDraftIndex >= 0 ? state.drafts[existingDraftIndex].id : `df-${Date.now()}`,
      incidentId: incident.id,
      incidentType: incident.typeOfEmergency || incident.type,
      lastSaved: 'Unsent - Auto-save active',
      formData,
      incidentDetails: incident
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
  }),

  enqueueAction: async (action) => {
    let updatedQueue: QueueAction[] = [];
    const currentQueue = useResponderStore.getState().offlineQueue;
    const telemetryIndex = currentQueue.findIndex(a => a.type === 'TELEMETRY_SYNC');

    if (action.type === 'TELEMETRY_SYNC' && telemetryIndex !== -1) {
      updatedQueue = [...currentQueue];
      updatedQueue[telemetryIndex] = {
        ...updatedQueue[telemetryIndex],
        payload: action.payload,
        timestamp: new Date().toISOString()
      };
    } else {
      const newAction: QueueAction = {
        ...action,
        id: `id-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      updatedQueue = [...currentQueue, newAction];
    }

    set({ offlineQueue: updatedQueue });
    await serializeSecureStoreWrite(updatedQueue);
  },

  dequeueAction: async (id) => {
    const currentQueue = useResponderStore.getState().offlineQueue;
    const updatedQueue = currentQueue.filter(action => action.id !== id);
    set({ offlineQueue: updatedQueue });
    await serializeSecureStoreWrite(updatedQueue);
  },

  loadOfflineQueue: async () => {
    try {
      const stored = await SecureStore.getItemAsync('disas_trace_offline_state_queue');
      if (stored) {
        set({ offlineQueue: JSON.parse(stored) });
      } else {
        set({ offlineQueue: [] });
      }
    } catch (e) {
      console.error('[useResponderStore] Failed to load offline queue from SecureStore:', e);
    }
  },

  setSyncingQueue: (isSyncingQueue) => set({ isSyncingQueue })
}));
