import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useResponderStore } from '../stores/useResponderStore';
import { supabase } from '../lib/supabase';
import { fetchWithTimeout } from '../lib/network-timeout';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { getMobileApiBaseUrl } from '../lib/api-base-url';
import { normalizeResponderLocationPayload } from '../lib/responder-location-status';

const OFFLINE_REPORTS_KEY = 'disas_trace_offline_reports';
const DRAFT_REMINDER_NOTIFICATION_KEY = 'disas_trace_draft_reminder_notification_id';

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
  const [retryNonce, setRetryNonce] = useState(0);

  // Monitor network connection status
  useEffect(() => {
    let mounted = true;
    const checkConnection = async () => {
      try {
        await fetch('https://clients3.google.com/generate_204', { mode: 'no-cors' });
        if (mounted) setIsOnline(true);
      } catch (err) {
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

  // 5-Minute Recurring Draft Reminder Loop (Triggers when device is online & pending drafts exist)
  useEffect(() => {
    if (!isOnline || drafts.length === 0) return;

    const sendDraftReminderNotification = async () => {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Pending Incident Draft Reminder',
            body: `You have ${drafts.length} unsent incident report draft(s). Please review and submit your report to CDRRMO HQ.`,
            data: { type: 'DRAFT_REMINDER' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null, // Send immediately
        });
        console.log(`[DraftReminder] Sent 5-minute reminder for ${drafts.length} pending draft(s).`);
      } catch (err) {
        console.error('[DraftReminder] Failed to present notification reminder:', err);
      }
    };

    // Initial reminder upon connection return if drafts exist
    sendDraftReminderNotification();

    return undefined;
  }, [isOnline, drafts.length]);

  // Native notifications continue after React is paused or Android later stops
  // the process. This is separate from the foreground immediate reminder above.
  useEffect(() => {
    let cancelled = false;
    const syncDraftReminder = async () => {
      const existingId = await SecureStore.getItemAsync(DRAFT_REMINDER_NOTIFICATION_KEY);
      if (drafts.length === 0) {
        if (existingId) await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => undefined);
        await SecureStore.deleteItemAsync(DRAFT_REMINDER_NOTIFICATION_KEY);
        return;
      }
      if (existingId || cancelled) return;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pending Incident Draft Reminder',
          body: 'You have an unsent incident report draft. Open DisasTRACE to review and submit it.',
          data: { kind: 'draft_reminder' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          android: { channelId: 'emergency-alerts' },
        } as Notifications.NotificationContentInput,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5 * 60,
          repeats: true,
        },
      });
      if (!cancelled) await SecureStore.setItemAsync(DRAFT_REMINDER_NOTIFICATION_KEY, id);
    };
    syncDraftReminder().catch((error) => console.error('[DraftReminder] Unable to schedule reminder:', error));
    return () => { cancelled = true; };
  }, [drafts.length]);

  // Trigger background sync when device transitions to online
  useEffect(() => {
    if (!isOnline || syncing) return;
    if (offlineQueue.length === 0 && drafts.length === 0) return;

    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const syncOfflineQueueAndDrafts = async () => {
      if (mounted) setSyncing(true);
      setSyncingQueue(true);

      const apiUrl = getMobileApiBaseUrl();
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
                if (!response.ok) {
                  if ([400, 403, 404, 409].includes(response.status)) {
                    const message = result?.error || `The queued action was rejected (HTTP ${response.status}).`;
                    useResponderStore.setState({ lastQueueError: message });
                    await dequeueAction(action.id);
                    if (result?.code === 'INCIDENT_REASSIGNED') {
                      useResponderStore.getState().completeIncident();
                    }
                    continue;
                  }
                  throw new Error(result?.error || `REST action returned status ${response.status}`);
                }
                if (action.endpoint === '/api/reports') {
                  const incidentId = action.payload.incidentId;
                  useResponderStore.setState((state) => ({
                    submittedIncidentIds: state.submittedIncidentIds.includes(incidentId)
                      ? state.submittedIncidentIds
                      : [...state.submittedIncidentIds, incidentId],
                    drafts: state.drafts.filter((draft) => draft.incidentId !== incidentId),
                    lastReportDelivery: 'CONFIRMED',
                    showReportSuccess: true,
                  }));
                } else if (action.endpoint === '/api/incidents/status' && action.payload.status === 'ARRIVED') {
                  useResponderStore.setState({ lastArrivalDelivery: 'CONFIRMED' });
                } else if (action.endpoint === '/api/incidents/status' && action.payload.status === 'DOCUMENTATION_PENDING') {
                  const incidentId = action.payload.incidentId;
                  useResponderStore.setState((state) => {
                    if (state.activeDispatch?.id !== incidentId) return { lastQueueError: null };
                    return {
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
                      lastQueueError: null,
                    };
                  });
                  alert('Field response synced. Your documentation remains saved, and you are now available for another dispatch.');
                }
              } else if (action.type === 'TELEMETRY_SYNC') {
                // Fire a standard REST location update via fetch against the specified endpoint
                const response = await fetch(`${apiUrl}${action.endpoint}`, {
                  method: action.method,
                  headers,
                  body: JSON.stringify(normalizeResponderLocationPayload(action.payload)),
                });
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
        if (queueSuccess && drafts.length > 0) {
          const cachedRaw = await SecureStore.getItemAsync(OFFLINE_REPORTS_KEY);
          const cachedQueue = cachedRaw ? JSON.parse(cachedRaw) : [];

          if (cachedQueue.length > 0) {
            console.log(`[useOfflineReports] Synchronizing ${cachedQueue.length} unsent report drafts...`);
            
            for (const draft of cachedQueue) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
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
        } else if (mounted) {
          retryTimer = setTimeout(() => setRetryNonce((value) => value + 1), 5_000);
        }
      } catch (err) {
        console.error('[useOfflineReports] Error during background synchronization:', err);
      } finally {
        if (mounted) setSyncing(false);
        setSyncingQueue(false);
      }
    };

    syncOfflineQueueAndDrafts();
    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isOnline, offlineQueue.length, drafts.length, dequeueAction, retryNonce, setSyncingQueue]);

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
