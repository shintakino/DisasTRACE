import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import {
  canEnterHospitalReport,
  canStartHospitalTransport,
  isEligibleHospitalDestination,
} from '../lib/hospital-destination-policy';
import { fetchWithTimeout } from '../lib/network-timeout';
import { normalizeResponderDistanceKm } from '../lib/responder-report-summary';
import { getMobileApiBaseUrl } from '../lib/api-base-url';

const DRAFTS_FILE_PATH = `${FileSystem.documentDirectory}disas_trace_drafts.json`;

const persistDrafts = async (drafts: any[]) => {
  try {
    await FileSystem.writeAsStringAsync(DRAFTS_FILE_PATH, JSON.stringify(drafts));
    console.log('[useResponderStore] Successfully persisted drafts to FileSystem');
  } catch (err) {
    console.error('[useResponderStore] Failed to persist drafts to file:', err);
  }
};

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export type DispatchState = 'idle' | 'dispatch_offered' | 'en_route' | 'on_scene' | 'to_hospital' | 'at_hospital' | 'report_filling';
export type FieldOutcome = 'HANDLED_ON_SCENE' | 'PATIENT_REFUSED' | 'HOSPITAL_ARRIVAL';

export interface QueueAction {
  id: string; // unique timestamp/uuid
  ownerUserId: string;
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
  recommended?: boolean;
}

export interface DispatchDetails {
  id: string;
  type: string; // e.g. "Vehicular Collision"
  locationName: string;
  distance: string; // e.g. "1.7 km"
  natureOfCall: string; // e.g. "EMERGENCY"
  peopleInvolved: number;
  eta?: string; // Server or route-derived, e.g. "~5 min"
  reporterName: string;
  reporterInitials: string;
  reporterPhone?: string;
  timestamp: string; // e.g. "09:43 PM"
  coordinates: {
    latitude: number;
    longitude: number;
  };
  attachmentUrl?: string; // Mock URL
  typeOfEmergency?: string; // e.g. "Medical"
  dispatchOfferDurationSeconds?: number; // Configurable duration in seconds
  offerExpiresAt?: string; // Server timestamp used for the responder countdown
  assignedAmbulance?: string; // e.g. "AMB-001"
  documentationPending?: boolean;
  fieldOutcome?: FieldOutcome | null;
}

export interface DraftForm {
  id: string; // e.g. df-123
  ownerUserId: string;
  incidentId: string; // matches DispatchDetails.id
  incidentType: string; // e.g. "Fire Emergency"
  lastSaved: string; // e.g. "2 mins ago"
  formData: any; // mock form data payload
  incidentDetails?: DispatchDetails; // Cache full incident context for draft recovery
  /** True only after the responder explicitly presses Save as Draft. */
  explicitlySaved?: boolean;
}

interface ResponderState {
  status: DispatchState;
  activeDispatch: DispatchDetails | null;
  targetHospital: HospitalDetails | null;
  sceneTimeSeconds: number;
  elapsedTimeSeconds: number;
  isArrivalConfirmVisible: boolean;
  isHospitalArrivalConfirmVisible: boolean;
  isSubmittingReport: boolean;
  showReportSuccess: boolean;
  lastReportDelivery: 'CONFIRMED' | 'QUEUED_OFFLINE' | null;
  lastArrivalDelivery: 'CONFIRMED' | 'QUEUED_OFFLINE' | null;
  currentSpeedKph: number;
  hospitalDistanceKm: number | null;
  hospitalEtaMins: number | null;
  responseTimeSeconds: number;
  initialDistanceKm: number;
  lastSubmittedSummary: {
    responseTimeStr: string;
    patientsCount: number;
    distanceKm: number;
  } | null;
  currentLocation: [number, number] | null;
  fieldOutcome: FieldOutcome | null;
  
  drafts: DraftForm[];
  submittedIncidentIds: string[];
  offlineQueue: QueueAction[];
  isSyncingQueue: boolean;
  lastQueueError: string | null;
  
  // Actions
  setStatus: (status: DispatchState) => void;
  setFieldOutcome: (fieldOutcome: FieldOutcome | null) => void;
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
  confirmHospitalArrival: () => void;
  hideHospitalArrivalConfirm: () => void;
  arriveAtHospital: () => Promise<void>;
  arriveAtScene: () => Promise<void>;
  transportToHospital: () => void;
  startReport: () => Promise<void>;
  deferDocumentation: (formData?: Record<string, unknown>) => Promise<boolean>;
  submitReport: (incidentId?: string, formData?: any) => Promise<void>;
  finishAndClose: () => void;
  completeIncident: () => void;
  
  // Forms & Drafts Actions
  saveDraft: (incident: DispatchDetails, formData: any, explicitlySaved?: boolean) => Promise<void>;
  removeDraft: (draftId: string) => void;
  openFormForIncident: (incident: DispatchDetails) => void;

  enqueueAction: (action: Omit<QueueAction, 'id' | 'timestamp' | 'ownerUserId'>) => Promise<void>;
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
  isHospitalArrivalConfirmVisible: false,
  isSubmittingReport: false,
  showReportSuccess: false,
  lastReportDelivery: null,
  lastArrivalDelivery: null,
  currentSpeedKph: 0,
  hospitalDistanceKm: null,
  hospitalEtaMins: null,
  responseTimeSeconds: 0,
  initialDistanceKm: 0,
  lastSubmittedSummary: null,
  currentLocation: null,
  fieldOutcome: null,
  drafts: [],
  submittedIncidentIds: [],
  offlineQueue: [],
  isSyncingQueue: false,
  lastQueueError: null,

  setStatus: (status) => set({ status }),
  setFieldOutcome: (fieldOutcome) => set({ fieldOutcome }),
  setActiveDispatch: (activeDispatch) => set({ activeDispatch }),
  setTargetHospital: (targetHospital) => {
    if (targetHospital !== null && !isEligibleHospitalDestination(targetHospital)) {
      console.warn('[useResponderStore] Ignored an unavailable or invalid hospital destination.');
      return;
    }
    set({
      targetHospital,
      hospitalDistanceKm: null,
      hospitalEtaMins: null,
    });
  },
  setHospitalRouteMetrics: (hospitalDistanceKm, hospitalEtaMins) => set({ hospitalDistanceKm, hospitalEtaMins }),
  incrementSceneTime: () => set((state) => ({ sceneTimeSeconds: state.sceneTimeSeconds + 1 })),
  incrementElapsedTime: () => set((state) => ({ elapsedTimeSeconds: state.elapsedTimeSeconds + 1 })),
  resetTimer: () => set({ sceneTimeSeconds: 0, elapsedTimeSeconds: 0 }),

  acceptDispatch: () => {
    let parsedDist = 1.7;
    const storeState = useResponderStore.getState();
    const currentDispatch = storeState.activeDispatch;
    const currentLoc = storeState.currentLocation;

    if (currentLoc && currentDispatch?.coordinates) {
      const meters = calculateDistanceMeters(
        currentLoc[1],
        currentLoc[0],
        currentDispatch.coordinates.latitude,
        currentDispatch.coordinates.longitude
      );
      parsedDist = Number((meters / 1000).toFixed(1));
    } else if (currentDispatch?.distance) {
      const match = currentDispatch.distance.match(/[\d.]+/);
      if (match) parsedDist = parseFloat(match[0]);
    }
    set({ 
      status: 'en_route',
      elapsedTimeSeconds: 0,
      responseTimeSeconds: 0,
      initialDistanceKm: parsedDist
    });
  },

  confirmArrival: () => set({ 
    isArrivalConfirmVisible: true
  }),

  hideArrivalConfirm: () => set({
    isArrivalConfirmVisible: false
  }),

  confirmHospitalArrival: () => set({ isHospitalArrivalConfirmVisible: true }),

  hideHospitalArrivalConfirm: () => set({ isHospitalArrivalConfirmVisible: false }),

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
          const apiUrl = getMobileApiBaseUrl();
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${apiUrl}/api/incidents/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ incidentId: activeDispatch.id, status: 'ARRIVED' }),
          });
          const result = await response.json();
          if (result?.code === 'INCIDENT_REASSIGNED') {
            alert(result.error);
            useResponderStore.getState().completeIncident();
            return;
          }
          if (!response.ok) {
            alert(result?.error || `Arrival was rejected by the server (HTTP ${response.status}).`);
            return;
          }
          dbSuccess = true;
          set({ lastArrivalDelivery: 'CONFIRMED' });
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
        set({ lastArrivalDelivery: 'QUEUED_OFFLINE' });
        alert('Arrival saved on this device and is still syncing with PACC. Keep the app open after reconnecting.');
      }
    }
    const enRouteDuration = useResponderStore.getState().elapsedTimeSeconds;
    set({
      status: 'on_scene',
      isArrivalConfirmVisible: false,
      sceneTimeSeconds: 0,
      responseTimeSeconds: enRouteDuration
    });
  },

  transportToHospital: () => {
    if (!canStartHospitalTransport(useResponderStore.getState().status)) {
      console.warn('[useResponderStore] Hospital transport is only available after scene arrival.');
      return;
    }
    set({
      status: 'to_hospital',
      targetHospital: null, // Reset so it can be dynamically chosen
      hospitalDistanceKm: null,
      hospitalEtaMins: null,
      elapsedTimeSeconds: 0,
    });
  },

  arriveAtHospital: async () => {
    const currentState = useResponderStore.getState();
    const activeDispatch = currentState.activeDispatch;
    const targetHospital = currentState.targetHospital;
    if (!activeDispatch || !isEligibleHospitalDestination(targetHospital) || !currentState.currentLocation) {
      alert('Select an available hospital and keep live GPS active before confirming hospital arrival.');
      return;
    }

    let confirmed = false;
    try {
      const isOnline = await checkConnectivity();
      if (isOnline) {
        const apiUrl = getMobileApiBaseUrl();
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${apiUrl}/api/responder/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            latitude: currentState.currentLocation[1],
            longitude: currentState.currentLocation[0],
            responderStatus: 'to_hospital',
            incidentId: activeDispatch.id,
            targetHospitalId: targetHospital.id,
            confirmHospitalArrival: true,
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.held) {
          alert(result?.message || 'Hospital arrival could not be confirmed. Keep GPS active or contact PACC.');
          return;
        }
        confirmed = true;
      }
    } catch (error) {
      console.error('[useResponderStore] Hospital arrival confirmation failed:', error);
    }

    if (!confirmed) {
      await useResponderStore.getState().enqueueAction({
        type: 'TELEMETRY_SYNC',
        endpoint: '/api/responder/location',
        method: 'POST',
        payload: {
          latitude: currentState.currentLocation[1],
          longitude: currentState.currentLocation[0],
          responderStatus: 'to_hospital',
          incidentId: activeDispatch.id,
          targetHospitalId: targetHospital.id,
          confirmHospitalArrival: true,
        },
      });
      alert('Hospital arrival was saved on this device and will sync with PACC after reconnection.');
    }

    set({
      status: 'at_hospital',
      fieldOutcome: 'HOSPITAL_ARRIVAL',
      isHospitalArrivalConfirmVisible: false,
    });
  },

  startReport: async () => {
    const currentState = useResponderStore.getState();
    const activeDispatch = currentState.activeDispatch;
    if (!canEnterHospitalReport(currentState.status, currentState.targetHospital)) {
      alert(currentState.status === 'to_hospital'
        ? 'Confirm arrival at the selected hospital before continuing to the report.'
        : 'The incident report becomes available after arrival at the scene.');
      return;
    }
    if (activeDispatch) {
      let isOnline = false;
      try {
        isOnline = await checkConnectivity();
      } catch (err) {
        isOnline = false;
      }

      if (isOnline) {
        try {
          const apiUrl = getMobileApiBaseUrl();
          const { data: { session } } = await supabase.auth.getSession();
          const authorizationHeaders: Record<string, string> = {};
          if (session?.access_token) {
            authorizationHeaders.Authorization = `Bearer ${session.access_token}`;
          }

          if (currentState.status === 'to_hospital' && currentState.targetHospital) {
            if (!currentState.currentLocation) {
              alert('A live responder location is required before hospital transport can be confirmed.');
              return;
            }

            const destinationResponse = await fetch(`${apiUrl}/api/responder/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authorizationHeaders,
              },
              body: JSON.stringify({
                latitude: currentState.currentLocation[1],
                longitude: currentState.currentLocation[0],
                responderStatus: 'to_hospital',
                incidentId: activeDispatch.id,
                targetHospitalId: currentState.targetHospital.id,
              }),
            });
            const destinationResult = await destinationResponse.json();
            if (!destinationResponse.ok || destinationResult?.held) {
              alert(destinationResult?.message || 'The hospital destination could not be confirmed. Contact PACC or select another available hospital.');
              return;
            }
          }

          const response = await fetch(
            `${apiUrl}/api/incidents/status?incidentId=${encodeURIComponent(activeDispatch.id)}`,
            { headers: authorizationHeaders },
          );
          const result = await response.json();
          if (result?.code === 'INCIDENT_REASSIGNED') {
            alert(result.error);
            useResponderStore.getState().completeIncident();
            return;
          }
          if (!response.ok) throw new Error(result?.error || `HTTP ${response.status}`);
        } catch (e) {
          // A network failure must not discard a legitimate offline form draft.
          // Final resolution remains server-authoritative when POST /api/reports succeeds.
          console.error('[useResponderStore] Could not verify incident ownership before opening the report form:', e);
        }
      }
    }
    set({
      status: 'report_filling'
    });
  },

  deferDocumentation: async (formData = {}) => {
    const currentState = useResponderStore.getState();
    const activeDispatch = currentState.activeDispatch;
    if (!activeDispatch) {
      alert('Confirm the field outcome before saving documentation for later.');
      return false;
    }

    await useResponderStore.getState().saveDraft(activeDispatch, formData, true);

    if (activeDispatch.documentationPending) {
      set({ status: 'idle', activeDispatch: null, fieldOutcome: null });
      alert('Draft updated. This incident is already pending documentation, so you remain available for dispatch.');
      return true;
    }
    if (!currentState.fieldOutcome) {
      alert('Confirm the field outcome before saving documentation for later.');
      return false;
    }

    const documentationRelease = {
      incidentId: activeDispatch.id,
      status: 'DOCUMENTATION_PENDING' as const,
      fieldOutcome: currentState.fieldOutcome,
    };
    const queueDocumentationRelease = async () => {
      await useResponderStore.getState().enqueueAction({
        type: 'STATE_CHANGE',
        endpoint: '/api/incidents/status',
        method: 'POST',
        payload: documentationRelease,
      });
      return useResponderStore.getState().offlineQueue.some((action) => (
        action.type === 'STATE_CHANGE'
        && action.endpoint === '/api/incidents/status'
        && action.payload?.incidentId === activeDispatch.id
        && action.payload?.status === 'DOCUMENTATION_PENDING'
      ));
    };

    try {
      const apiUrl = getMobileApiBaseUrl();
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetchWithTimeout(`${apiUrl}/api/incidents/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(documentationRelease),
      }, 12_000, 'field response confirmation');
      const result = await response.json().catch(() => null);
      if (result?.code === 'INCIDENT_REASSIGNED') {
        alert(result.error);
        useResponderStore.getState().completeIncident();
        return false;
      }
      if (!response.ok) {
        if (response.status >= 500 && await queueDocumentationRelease()) {
          alert('Your draft is saved. The field response will automatically be sent when the connection is restored. You remain assigned until it is confirmed.');
          return false;
        }
        alert(result?.error || 'Your draft is saved on this device, but you remain assigned until PACC confirms the field response.');
        return false;
      }

      set({
        status: 'idle',
        activeDispatch: null,
        targetHospital: null,
        fieldOutcome: null,
        sceneTimeSeconds: 0,
        elapsedTimeSeconds: 0,
        isArrivalConfirmVisible: false,
        isHospitalArrivalConfirmVisible: false,
        hospitalDistanceKm: null,
        hospitalEtaMins: null,
      });
      alert('Field response completed. Your documentation is saved for later and you are now available for another dispatch.');
      return true;
    } catch (error) {
      console.error('[useResponderStore] Could not defer documentation:', error);
      if (await queueDocumentationRelease()) {
        alert('Your draft is saved. The field response will automatically be sent when the connection is restored. You remain assigned until it is confirmed.');
        return false;
      }
      alert('Your draft is saved on this device, but the field response could not be queued. Reconnect and try again before taking another dispatch.');
      return false;
    }
  },

  submitReport: async (incidentId?: string, formData?: any) => {
    set({ isSubmittingReport: true, lastReportDelivery: null });
    const idToSubmit = incidentId || useResponderStore.getState().activeDispatch?.id;
    if (!idToSubmit) {
      set({ isSubmittingReport: false });
      return;
    }

    const responseTimeSecs = useResponderStore.getState().responseTimeSeconds;
    let responseTimeStr = '0s';
    if (responseTimeSecs > 0) {
      const mins = Math.floor(responseTimeSecs / 60);
      const secs = responseTimeSecs % 60;
      if (mins > 0) {
        responseTimeStr = secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
      } else {
        responseTimeStr = `${secs}s`;
      }
    }

    let initialDist = normalizeResponderDistanceKm(useResponderStore.getState().initialDistanceKm);
    if (initialDist === 0) {
      const currentDispatch = useResponderStore.getState().activeDispatch;
      const currentLoc = useResponderStore.getState().currentLocation;
      if (currentLoc && currentDispatch?.coordinates) {
        const meters = calculateDistanceMeters(
          currentLoc[1],
          currentLoc[0],
          currentDispatch.coordinates.latitude,
          currentDispatch.coordinates.longitude
        );
        initialDist = Number((meters / 1000).toFixed(1));
      }
    }
    const hospDist = normalizeResponderDistanceKm(useResponderStore.getState().hospitalDistanceKm);
    const totalDistance = initialDist + hospDist;

    const summary = {
      responseTimeStr: responseTimeStr,
      patientsCount: formData?.patients?.length || 1,
      distanceKm: totalDistance,
    };

    try {
      const apiUrl = getMobileApiBaseUrl();
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
          patientCareReports: formData?.patientCareReports || [],
          driverTripTicket: formData?.driverTripTicket || null,
        })
      });

      const res = await response.json().catch(() => null);
      if (!response.ok || !res?.success) {
        console.error('Failed to submit report:', res?.error || response.status);
        if (res?.code === 'INCIDENT_REASSIGNED') {
          alert(res.error);
          useResponderStore.getState().completeIncident();
          return;
        }
        alert(res?.error || `Failed to submit report (HTTP ${response.status}).`);
        set({ isSubmittingReport: false });
        return;
      }
      if (res.success) {
        const nextDrafts = useResponderStore.getState().drafts.filter(d => d.incidentId !== idToSubmit);
        set((state) => ({
          isSubmittingReport: false,
          showReportSuccess: true,
          lastReportDelivery: 'CONFIRMED',
          lastSubmittedSummary: summary,
          submittedIncidentIds: [...state.submittedIncidentIds, idToSubmit],
          drafts: nextDrafts
        }));
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
          patientCareReports: formData?.patientCareReports || [],
          driverTripTicket: formData?.driverTripTicket || null,
        }
      });

      set(() => ({
        isSubmittingReport: false,
        showReportSuccess: true,
        lastReportDelivery: 'QUEUED_OFFLINE',
        lastSubmittedSummary: summary,
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
    lastReportDelivery: null,
    lastArrivalDelivery: null,
    currentSpeedKph: 0,
    hospitalDistanceKm: null,
    hospitalEtaMins: null,
    fieldOutcome: null,
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
    fieldOutcome: null,
    lastSubmittedSummary: null
  }),

  saveDraft: async (incident, formData, explicitlySaved = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user.id) return;
    set((state) => {
    const existingDraftIndex = state.drafts.findIndex(d => d.incidentId === incident.id);
    const existingDraft = existingDraftIndex >= 0 ? state.drafts[existingDraftIndex] : undefined;
    const newDraft: DraftForm = {
      id: existingDraft?.id || `df-${Date.now()}`,
      ownerUserId: session.user.id,
      incidentId: incident.id,
      incidentType: incident.typeOfEmergency || incident.type,
      lastSaved: explicitlySaved || existingDraft?.explicitlySaved
        ? 'Saved as draft'
        : 'Unsent - Auto-save active',
      formData,
      incidentDetails: incident,
      // An automatic recovery save must never undo an intentional draft save.
      explicitlySaved: explicitlySaved || existingDraft?.explicitlySaved || false,
    };

    let newDrafts: DraftForm[] = [];
    if (existingDraftIndex >= 0) {
      newDrafts = [...state.drafts];
      newDrafts[existingDraftIndex] = newDraft;
    } else {
      newDrafts = [...state.drafts, newDraft];
    }
    
      return { drafts: newDrafts };
    });
  },

  removeDraft: (draftId) => set((state) => ({
    drafts: state.drafts.filter((draft) => draft.id !== draftId),
  })),

  openFormForIncident: (incident) => set({
    activeDispatch: incident,
    fieldOutcome: incident.fieldOutcome ?? null,
    status: 'report_filling'
  }),

  enqueueAction: async (action) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user.id) {
      console.error('[useResponderStore] Refusing to queue an action without an authenticated responder.');
      return;
    }
    set({ lastQueueError: null });
    let updatedQueue: QueueAction[] = [];
    const currentQueue = useResponderStore.getState().offlineQueue;
    const telemetryIndex = currentQueue.findIndex(a => a.type === 'TELEMETRY_SYNC' && a.ownerUserId === session.user.id);
    const documentationReleaseIndex = currentQueue.findIndex((queuedAction) => (
      queuedAction.type === 'STATE_CHANGE'
      && queuedAction.ownerUserId === session.user.id
      && queuedAction.endpoint === '/api/incidents/status'
      && queuedAction.payload?.status === 'DOCUMENTATION_PENDING'
      && queuedAction.payload?.incidentId === action.payload?.incidentId
    ));

    if (action.type === 'TELEMETRY_SYNC' && telemetryIndex !== -1) {
      updatedQueue = [...currentQueue];
      updatedQueue[telemetryIndex] = {
        ...updatedQueue[telemetryIndex],
        ownerUserId: session.user.id,
        payload: action.payload,
        timestamp: new Date().toISOString()
      };
    } else if (documentationReleaseIndex !== -1) {
      return;
    } else {
      const newAction: QueueAction = {
        ...action,
        ownerUserId: session.user.id,
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
      const { data: { session } } = await supabase.auth.getSession();
      const ownerUserId = session?.user.id;
      const stored = await SecureStore.getItemAsync('disas_trace_offline_state_queue');
      if (stored) {
        const parsed = JSON.parse(stored) as QueueAction[];
        const owned = ownerUserId ? parsed.filter((action) => action.ownerUserId === ownerUserId) : [];
        set({ offlineQueue: owned });
        await serializeSecureStoreWrite(owned);
      } else {
        set({ offlineQueue: [] });
      }

      const fileInfo = await FileSystem.getInfoAsync(DRAFTS_FILE_PATH);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(DRAFTS_FILE_PATH);
        const parsed = JSON.parse(fileContent) as DraftForm[];
        const owned = ownerUserId ? parsed.filter((draft) => draft.ownerUserId === ownerUserId) : [];
        set({ drafts: owned });
        await persistDrafts(owned);
      } else {
        // Fallback to legacy SecureStore if file doesn't exist yet
        const storedDrafts = await SecureStore.getItemAsync('disas_trace_drafts');
        if (storedDrafts) {
          const parsed = JSON.parse(storedDrafts) as DraftForm[];
          const owned = ownerUserId ? parsed.filter((draft) => draft.ownerUserId === ownerUserId) : [];
          set({ drafts: owned });
          // Migrate to FileSystem immediately
          await FileSystem.writeAsStringAsync(DRAFTS_FILE_PATH, JSON.stringify(owned));
          await SecureStore.deleteItemAsync('disas_trace_drafts').catch(() => {});
        } else {
          set({ drafts: [] });
        }
      }
    } catch (e) {
      console.error('[useResponderStore] Failed to load offline data:', e);
    }
  },

  setSyncingQueue: (isSyncingQueue) => set({ isSyncingQueue })
}));

// Auto-persist drafts on change
let lastDrafts = useResponderStore.getState().drafts;
useResponderStore.subscribe((state) => {
  if (state.drafts !== lastDrafts) {
    lastDrafts = state.drafts;
    persistDrafts(lastDrafts);
  }
});
