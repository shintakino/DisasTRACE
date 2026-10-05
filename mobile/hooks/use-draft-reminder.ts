import { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { checkConnectivity, useResponderStore } from '../stores/useResponderStore';
import { draftReminderKeyForResponder, shouldScheduleDraftReminder } from '../lib/draft-reminder-policy';

const LEGACY_DRAFT_REMINDER_NOTIFICATION_KEY = 'disas_trace_draft_reminder_notification_id';

async function cancelDraftReminder(storageKey: string) {
  const notificationId = await SecureStore.getItemAsync(storageKey);
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
  await SecureStore.deleteItemAsync(storageKey);
}

/** Mounted once by the tab shell so a responder receives at most one reminder. */
export function useDraftReminder(responderId: string | null | undefined) {
  const drafts = useResponderStore((state) => state.drafts);
  // Do not create a native reminder until the initial connectivity check has
  // completed. This prevents an offline launch from briefly scheduling one.
  const [isOnline, setIsOnline] = useState(false);
  const ownedDrafts = useMemo(
    () => responderId ? drafts.filter((draft) => draft.ownerUserId === responderId) : [],
    [drafts, responderId],
  );
  const draftSignature = ownedDrafts.map((draft) => `${draft.id}:${draft.lastSaved}`).sort().join('|');
  const storageKey = responderId ? draftReminderKeyForResponder(responderId) : null;

  useEffect(() => {
    if (!responderId) {
      setIsOnline(false);
      return;
    }
    let active = true;
    const refreshConnection = async () => {
      const connected = await checkConnectivity();
      if (active) setIsOnline(connected);
    };
    void refreshConnection();
    const interval = setInterval(() => void refreshConnection(), 4_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [responderId]);

  useEffect(() => {
    // One-time migration removes notifications created by the old global key.
    void cancelDraftReminder(LEGACY_DRAFT_REMINDER_NOTIFICATION_KEY);
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    let active = true;

    const synchronizeReminder = async () => {
      if (!shouldScheduleDraftReminder({ responderId, isOnline, draftCount: ownedDrafts.length })) {
        await cancelDraftReminder(storageKey);
        return;
      }

      const existingId = await SecureStore.getItemAsync(storageKey);
      if (existingId || !active) return;
      const notificationId = await Notifications.scheduleNotificationAsync({
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
      if (!active) {
        await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
        return;
      }
      await SecureStore.setItemAsync(storageKey, notificationId);
    };

    void synchronizeReminder().catch((error) => console.error('[DraftReminder] Unable to synchronize reminder:', error));
    return () => { active = false; };
  }, [draftSignature, isOnline, ownedDrafts.length, responderId, storageKey]);

  useEffect(() => {
    return () => {
      if (storageKey) void cancelDraftReminder(storageKey);
    };
  }, [storageKey]);
}
