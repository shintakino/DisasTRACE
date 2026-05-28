import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useResponderStore } from '../stores/useResponderStore';

const OFFLINE_REPORTS_KEY = 'disas_trace_offline_reports';

export function useOfflineReports() {
  const { drafts, submitReport } = useResponderStore();
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
    if (!isOnline || drafts.length === 0 || syncing) return;

    const synchronizeDrafts = async () => {
      setSyncing(true);
      console.log(`Connection recovered: Synchronizing ${drafts.length} unsent report drafts...`);

      try {
        const cachedRaw = await SecureStore.getItemAsync(OFFLINE_REPORTS_KEY);
        const cachedQueue = cachedRaw ? JSON.parse(cachedRaw) : [];

        if (cachedQueue.length > 0) {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
          
          for (const draft of cachedQueue) {
            // 1. Upload mock local file images (simulated bucket sync)
            const scenePhotoUrls = draft.scenePhotos?.map((p: string) => 
              p.startsWith('file://') ? `https://supabase-bucket.co/scenes/${draft.incidentId}/${Date.now()}.jpg` : p
            ) || [];

            // 2. Submit report to backend API
            const payload = {
              incidentId: draft.incidentId,
              responderId: draft.responderId,
              description: draft.description,
              scenePhotos: scenePhotoUrls,
              participants: draft.participants || [],
            };

            const response = await fetch(`${apiUrl}/api/reports/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              console.log(`Sync success: Draft report for incident ${draft.incidentId} uploaded.`);
              submitReport(draft.incidentId);
            }
          }

          // Purge processed cache
          await SecureStore.deleteItemAsync(OFFLINE_REPORTS_KEY);
        }
      } catch (error) {
        console.error('Error synchronizing offline reports:', error);
      } finally {
        setSyncing(false);
      }
    };

    synchronizeDrafts();
  }, [isOnline, drafts.length, syncing]);

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

  return { isOnline, syncing, bufferReportOffline };
}
