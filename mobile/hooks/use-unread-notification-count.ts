import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { getMobileApiBaseUrl } from '../lib/api-base-url';
import { fetchWithTimeout } from '../lib/network-timeout';
import { isNotificationVisibleForRole } from '../lib/report-location';

/** The badge reads the same authorized inbox as the Notifications screen. */
export function useUnreadNotificationCount(userId: string | null, role: string | null) {
  const [snapshot, setSnapshot] = useState({ userId, count: 0 });
  const refreshRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    let version = 0;
    const refresh = async () => {
      const request = ++version;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active || session?.user.id !== userId) return;
        const response = await fetchWithTimeout(`${getMobileApiBaseUrl()}/api/notifications?unreadOnly=true`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }, 15_000, 'notification badge');
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== 'object' || !('notifications' in payload)
          || !Array.isArray(payload.notifications)) return;
        if (!active || request !== version) return;
        const count = payload.notifications.filter((notification: unknown) => {
          return notification && typeof notification === 'object' && 'type' in notification
            && typeof notification.type === 'string' && isNotificationVisibleForRole(notification.type, role);
        }).length;
        setSnapshot({ userId, count });
      } catch {
        // Preserve the last confirmed count during a temporary read failure.
      }
    };
    const requestRefresh = () => { void refresh(); };
    refreshRef.current = requestRefresh;
    requestRefresh();
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') requestRefresh();
    });
    const received = Notifications.addNotificationReceivedListener(requestRefresh);
    const channel = supabase.channel(`notification-badge-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, requestRefresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') requestRefresh(); });
    return () => {
      active = false;
      version += 1;
      refreshRef.current = () => undefined;
      foreground.remove();
      received.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId, role]);
  useFocusEffect(useCallback(() => { refreshRef.current(); }, []));
  return snapshot.userId === userId ? snapshot.count : 0;
}
