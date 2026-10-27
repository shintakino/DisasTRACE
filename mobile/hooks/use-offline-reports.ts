import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import * as SecureStore from 'expo-secure-store';
import { useResponderStore } from '../stores/useResponderStore';
import { supabase } from '../lib/supabase';
import { fetchWithTimeout } from '../lib/network-timeout';
import * as Haptics from 'expo-haptics';
import { getMobileApiBaseUrl } from '../lib/api-base-url';
import { normalizeResponderLocationPayload } from '../lib/responder-location-status';
import { useResponderDutyStore } from '../stores/useResponderDutyStore';
import { useAuthStatus } from './use-auth-status';

const OFFLINE_REPORTS_KEY = 'disas_trace_offline_reports';

function useOfflineReportsState() {
  const { user, role, verificationStatus } = useAuthStatus();
  const ownerId = user?.id;
  const enabled = Boolean(ownerId) && role === 'ambulance_responder' && verificationStatus === 'approved';
  const running = useRef(false);
  const rerun = useRef(false);
  const active = useRef(true);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);
  const { 
    drafts, 
    offlineQueue, 
    dequeueAction, 
    setSyncingQueue, 
    isSyncingQueue 
  } = useResponderStore(useShallow(state => ({
    drafts: state.drafts,
    offlineQueue: state.offlineQueue,
    dequeueAction: state.dequeueAction,
    setSyncingQueue: state.setSyncingQueue,
    isSyncingQueue: state.isSyncingQueue,
  })));
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Monitor network connection status
  useEffect(() => {
    let mounted = true;
    const checkConnection = async () => {
      try {
        await fetch('https://clients3.google.com/generate_204', { mode: 'no-cors' });
        if (mounted) setIsOnline(true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };
    void checkConnection();
    const interval = setInterval(() => void checkConnection(), 4000); // Poll every 4 seconds to check internet connectivity

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Trigger background sync when device transitions to online
  useEffect(() => {
    if (!enabled || !isOnline) return;
    if (offlineQueue.length === 0 && drafts.length === 0) return;
    if (running.current) { rerun.current = true; return; }
    running.current = true;
    rerun.current = false;

    const isCurrentOwner = () => active.current && useResponderStore.getState().ownerUserId === ownerId;
    const syncOfflineQueueAndDrafts = async () => {
      setSyncing(true);
      setSyncingQueue(true);

      const apiUrl = getMobileApiBaseUrl();
      let queueSuccess = true;

      try {
        // 1. Process all items in the offlineQueue in sequential FIFO order (chronologically)
        if (offlineQueue.length > 0) {
          console.log(`[useOfflineReports] Connection recovered: Replaying ${offlineQueue.length} offline actions in FIFO order...`);
          
          for (const action of offlineQueue) {
            if (!isCurrentOwner()) return;
            try {
              console.log(`[useOfflineReports] Replaying action: type=${action.type}, endpoint=${action.endpoint}, method=${action.method}`);
              
              // Retrieve authenticated Supabase sessions to extract current bearer tokens
              const { data: { session } } = await supabase.auth.getSession();
              if (!isCurrentOwner()) return;
              if (!session?.user.id || action.ownerUserId !== session.user.id) {
                console.warn('[useOfflineReports] Removing an offline action owned by a different responder session.');
                await dequeueAction(action.id);
                continue;
              }
              const headers: any = { 'Content-Type': 'application/json' };
              if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
              }

              if (action.type === 'STATE_CHANGE') {
                // Replay through authenticated server routes so authorization,
                // ownership and workflow transition checks remain authoritative.
                const response = await fetchWithTimeout(`${apiUrl}${action.endpoint}`, {
                  method: action.method,
                  headers,
                  body: JSON.stringify(action.payload),
                }, 12_000, 'queued responder update');
                const result = await response.json().catch(() => null);
                if (!isCurrentOwner()) return;
                if (!response.ok) {
                  if ([400, 403, 404, 409].includes(response.status)) {
                    const message = result?.error || `The queued action was rejected (HTTP ${response.status}).`;
                    useResponderStore.setState({ lastQueueError: message });
                    await dequeueAction(action.id);
                    if (result?.code === 'INCIDENT_REASSIGNED') {
                      useResponderStore.getState().completeIncident(action.payload.incidentId);
                    }
                    continue;
                  }
                  throw new Error(result?.error || `REST action returned status ${response.status}`);
                }
                if (action.endpoint === '/api/reports') {
                  const incidentId = action.payload.incidentId;
                  const currentIncident = useResponderStore.getState().activeDispatch?.id;
                  if (!currentIncident || currentIncident === incidentId) useResponderDutyStore.getState().setDutyStatus(result?.dutyStatus);
                  else useResponderStore.getState().requestRecovery();
                  useResponderStore.setState((state) => ({
                    submittedIncidentIds: state.submittedIncidentIds.includes(incidentId)
                      ? state.submittedIncidentIds
                      : [...state.submittedIncidentIds, incidentId],
                    drafts: state.drafts.filter((draft) => draft.incidentId !== incidentId),
                    ...(state.reportFormSession?.incident.id === incidentId ? { lastReportDelivery: 'CONFIRMED' as const, showReportSuccess: true } : {}),
                  }));
                } else if (action.endpoint === '/api/incidents/status' && action.payload.status === 'ARRIVED') {
                  if (useResponderStore.getState().activeDispatch?.id === action.payload.incidentId) {
                    useResponderStore.setState({ lastArrivalDelivery: 'CONFIRMED' });
                  }
                } else if (action.endpoint === '/api/incidents/status' && action.payload.status === 'DOCUMENTATION_PENDING') {
                  const incidentId = action.payload.incidentId;
                  useResponderStore.getState().completeIncident(incidentId);
                  alert('Field response synced. Your documentation remains saved in Forms.');
                }
              } else if (action.type === 'HOSPITAL_ARRIVAL_CONFIRMATION') {
                const response = await fetchWithTimeout(`${apiUrl}${action.endpoint}`, {
                  method: action.method,
                  headers,
                  body: JSON.stringify(normalizeResponderLocationPayload(action.payload)),
                }, 12_000, 'hospital arrival confirmation');
                const result = await response.json().catch(() => null);
                if (!isCurrentOwner()) return;
                if (!response.ok || result?.held) {
                  const message = result?.message || result?.error || 'Hospital arrival could not be confirmed.';
                  if ([202, 400, 403, 404, 409, 422].includes(response.status)) {
                    useResponderStore.setState((state) => ({
                      lastQueueError: message,
                      ...(state.activeDispatch?.id === action.payload?.incidentId
                        ? { status: 'to_hospital', fieldOutcome: null, isHospitalArrivalPendingSync: false, isHospitalArrivalConfirmVisible: false }
                        : {}),
                    }));
                    await dequeueAction(action.id);
                    continue;
                  }
                  throw new Error(message);
                }

                useResponderStore.setState((state) => ({
                  lastQueueError: null,
                  ...(state.activeDispatch?.id === action.payload?.incidentId
                    ? { status: 'at_hospital', fieldOutcome: 'HOSPITAL_ARRIVAL' as const, isHospitalArrivalPendingSync: false, isHospitalArrivalConfirmVisible: false }
                    : {}),
                }));
                alert('Hospital arrival confirmed. You can now complete the documentation or save it for later.');
              } else if (action.type === 'TELEMETRY_SYNC') {
                // Fire a standard REST location update via fetch against the specified endpoint
                const response = await fetch(`${apiUrl}${action.endpoint}`, {
                  method: action.method,
                  headers,
                  body: JSON.stringify(normalizeResponderLocationPayload(action.payload)),
                });
                if (!isCurrentOwner()) return;
                if (!response.ok) {
                  if ([400, 403, 404, 409].includes(response.status)) {
                    const result = await response.json().catch(() => null);
                    useResponderStore.setState({ lastQueueError: result?.error || `Telemetry update rejected (HTTP ${response.status}).` });
                    await dequeueAction(action.id);
                    continue;
                  }
                  throw new Error(`Telemetry sync returned status ${response.status}`);
                }
              }

              // On action replay success: dequeue the action
              await dequeueAction(action.id);
              useResponderStore.setState({ lastQueueError: null });
              console.log(`[useOfflineReports] Successfully replayed action ${action.id}`);
            } catch (actionErr) {
              console.error(`[useOfflineReports] Replay failure for action ${action.id}:`, actionErr);
              queueSuccess = false;
              // Pause execution to prevent server flooding and retry on the next interval
              break;
            }
          }
        }

        // 2. After replaying the queue, proceed with the standard unsent report drafts sync
        if (isCurrentOwner() && queueSuccess && drafts.length > 0) {
          const cachedRaw = await SecureStore.getItemAsync(OFFLINE_REPORTS_KEY);
          const cachedQueue = cachedRaw ? JSON.parse(cachedRaw) : [];

          if (cachedQueue.length > 0) {
            console.log(`[useOfflineReports] Synchronizing ${cachedQueue.length} unsent report drafts...`);
            
            for (const draft of cachedQueue) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isCurrentOwner()) return;
                if (!session?.user.id || draft.ownerUserId !== session.user.id) {
                  console.warn('[useOfflineReports] Skipping a cached report owned by another responder session.');
                  continue;
                }
                // Upload mock local file images (simulated bucket sync)
                const scenePhotoUrls = draft.scenePhotos?.map((p: string) => 
                  p.startsWith('file://') ? `https://supabase-bucket.co/scenes/${draft.incidentId}/${Date.now()}.jpg` : p
                ) || [];

                const payload = {
                  incidentId: draft.incidentId,
                  responderId: draft.responderId,
                  description: draft.description,
                  scenePhotos: scenePhotoUrls,
                  participants: draft.participants || [],
                };

                const headers: any = { 'Content-Type': 'application/json' };
                if (session?.access_token) {
                  headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                // Standard fetch post to live API reports endpoint
                const response = await fetch(`${apiUrl}/api/reports`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(payload),
                });
                if (!isCurrentOwner()) return;

                if (response.ok) {
                  console.log(`[useOfflineReports] Sync success: Draft report for incident ${draft.incidentId} uploaded.`);
                  
                  // Construct report summary metrics for local state hydration
                  let parsedDistance = 1.7;
                  if (draft.incidentDetails?.distance) {
                    const match = draft.incidentDetails.distance.match(/[\d.]+/);
                    if (match) parsedDistance = parseFloat(match[0]);
                  }
                  const summary = {
                    responseTimeStr: '9m',
                    patientsCount: draft.participants?.length || 1,
                    distanceKm: parsedDistance,
                  };

                  // Update global Zustand store state directly to synchronize drafts list and show success UI
                  useResponderStore.setState((state) => ({
                    submittedIncidentIds: [...state.submittedIncidentIds, draft.incidentId],
                    drafts: state.drafts.filter(d => d.incidentId !== draft.incidentId),
                    lastSubmittedSummary: summary,
                    showReportSuccess: true,
                  }));
                } else {
                  console.error(`[useOfflineReports] Failed to sync draft report for incident ${draft.incidentId}: Status ${response.status}`);
                }
              } catch (draftErr) {
                console.error(`[useOfflineReports] Failed to sync draft report for incident ${draft.incidentId}:`, draftErr);
              }
            }

            // Purge processed cache
            await SecureStore.deleteItemAsync(OFFLINE_REPORTS_KEY);
          }
        }

        // Trigger a light tactile success haptic warning once all pending actions are fully flushed and synced
        if (queueSuccess) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (isCurrentOwner()) {
          retryTimer.current = setTimeout(() => {
            if (active.current) setRetryNonce((value) => value + 1);
          }, 5_000);
        }
      } catch (err) {
        console.error('[useOfflineReports] Error during background synchronization:', err);
      } finally {
        running.current = false;
        if (active.current) setSyncing(false);
        setSyncingQueue(false);
        if (rerun.current && queueSuccess && active.current) setRetryNonce((value) => value + 1);
      }
    };

    syncOfflineQueueAndDrafts();
  }, [enabled, ownerId, isOnline, offlineQueue, drafts.length, dequeueAction, retryNonce, setSyncingQueue]);

  // Method to save drafts offline
  const bufferReportOffline = async (report: {
    incidentId: string;
    responderId: string;
    description: string;
    scenePhotos: string[];
    participants: any[];
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user.id || (report.responderId && report.responderId !== session.user.id)) {
        throw new Error('Cannot cache a report for a different responder session.');
      }
      const cachedRaw = await SecureStore.getItemAsync(OFFLINE_REPORTS_KEY);
      const cachedQueue = cachedRaw ? JSON.parse(cachedRaw) : [];
      
      const newQueue = [...cachedQueue, { ...report, ownerUserId: session.user.id, id: `df-${Date.now()}`, timestamp: new Date().toISOString() }];
      await SecureStore.setItemAsync(OFFLINE_REPORTS_KEY, JSON.stringify(newQueue));
      
      console.log(`Offline: Report draft for incident ${report.incidentId} successfully cached in local SecureStore.`);
    } catch (err) {
      console.error('Failed to buffer draft locally:', err);
    }
  };

  return { 
    isOnline, 
    syncing, 
    bufferReportOffline,
    isSyncingQueue,
    offlineQueue
  };
}

const OfflineReportsContext = createContext<ReturnType<typeof useOfflineReportsState> | null>(null);

export function OfflineReportsProvider({ children }: { children: ReactNode }) {
  return createElement(OfflineReportsContext.Provider, { value: useOfflineReportsState() }, children);
}

export function useOfflineReports() {
  const value = useContext(OfflineReportsContext);
  if (!value) throw new Error('OfflineReportsProvider is required.');
  return value;
}
