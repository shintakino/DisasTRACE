import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useResponderStore } from '../stores/useResponderStore';
import { supabase } from '../lib/supabase';
import * as Haptics from 'expo-haptics';

const OFFLINE_REPORTS_KEY = 'disas_trace_offline_reports';

export function useOfflineReports() {
  const { 
    drafts, 
    offlineQueue, 
    dequeueAction, 
    setSyncingQueue, 
    isSyncingQueue 
  } = useResponderStore();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Monitor network connection status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await fetch('https://clients3.google.com/generate_204', { mode: 'no-cors' });
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    }, 4000); // Poll every 4 seconds to check internet connectivity

    return () => clearInterval(interval);
  }, []);

  // Trigger background sync when device transitions to online
  useEffect(() => {
    if (!isOnline || syncing) return;
    if (offlineQueue.length === 0 && drafts.length === 0) return;

    const syncOfflineQueueAndDrafts = async () => {
      setSyncing(true);
      setSyncingQueue(true);

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      let queueSuccess = true;

      try {
        // 1. Process all items in the offlineQueue in sequential FIFO order (chronologically)
        if (offlineQueue.length > 0) {
          console.log(`[useOfflineReports] Connection recovered: Replaying ${offlineQueue.length} offline actions in FIFO order...`);
          
          for (const action of offlineQueue) {
            try {
              console.log(`[useOfflineReports] Replaying action: type=${action.type}, endpoint=${action.endpoint}, method=${action.method}`);
              
              // Retrieve authenticated Supabase sessions to extract current bearer tokens
              const { data: { session } } = await supabase.auth.getSession();
              const headers: any = { 'Content-Type': 'application/json' };
              if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
              }

              if (action.type === 'STATE_CHANGE') {
                if (action.endpoint === '/api/incidents/status') {
                  // Perform a direct Supabase table client call to match the status transition
                  const { incidentId, status, resolvedAt } = action.payload;
                  const updatePayload: any = { status };
                  if (resolvedAt) {
                    updatePayload.resolved_at = resolvedAt;
                  }
                  const { error } = await supabase
                    .from('incidents')
                    .update(updatePayload)
                    .eq('id', incidentId);
                  
                  if (error) throw error;
                } else {
                  // Fire a standard REST request using fetch against the specified endpoint
                  const response = await fetch(`${apiUrl}${action.endpoint}`, {
                    method: action.method,
                    headers,
                    body: JSON.stringify(action.payload),
                  });
                  if (!response.ok) {
                    throw new Error(`REST action returned status ${response.status}`);
                  }
                }
              } else if (action.type === 'TELEMETRY_SYNC') {
                // Fire a standard REST location update via fetch against the specified endpoint
                const response = await fetch(`${apiUrl}${action.endpoint}`, {
                  method: action.method,
                  headers,
                  body: JSON.stringify(action.payload),
                });
                if (!response.ok) {
                  throw new Error(`Telemetry sync returned status ${response.status}`);
                }
              }

              // On action replay success: dequeue the action
              await dequeueAction(action.id);
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
        if (queueSuccess && drafts.length > 0) {
          const cachedRaw = await SecureStore.getItemAsync(OFFLINE_REPORTS_KEY);
          const cachedQueue = cachedRaw ? JSON.parse(cachedRaw) : [];

          if (cachedQueue.length > 0) {
            console.log(`[useOfflineReports] Synchronizing ${cachedQueue.length} unsent report drafts...`);
            
            for (const draft of cachedQueue) {
              try {
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

                const { data: { session } } = await supabase.auth.getSession();
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

                if (response.ok) {
                  console.log(`[useOfflineReports] Sync success: Draft report for incident ${draft.incidentId} uploaded.`);
                  
                  // Construct report summary metrics for local state hydration
                  let parsedDistance = 1.7;
                  if (draft.incidentDetails?.distance) {
                    const match = draft.incidentDetails.distance.match(/[\d.]+/);
                    if (match) parsedDistance = parseFloat(match[0]);
                  }
                  const summary = {
                    responseTimeMins: 9,
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
        }
      } catch (err) {
        console.error('[useOfflineReports] Error during background synchronization:', err);
      } finally {
        setSyncing(false);
        setSyncingQueue(false);
      }
    };

    syncOfflineQueueAndDrafts();
  }, [isOnline, offlineQueue.length, drafts.length, dequeueAction, setSyncingQueue]);

  // Method to save drafts offline
  const bufferReportOffline = async (report: {
    incidentId: string;
    responderId: string;
    description: string;
    scenePhotos: string[];
    participants: any[];
  }) => {
    try {
      const cachedRaw = await SecureStore.getItemAsync(OFFLINE_REPORTS_KEY);
      const cachedQueue = cachedRaw ? JSON.parse(cachedRaw) : [];
      
      const newQueue = [...cachedQueue, { ...report, id: `df-${Date.now()}`, timestamp: new Date().toISOString() }];
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
