import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { getMobileApiBaseUrl } from '../lib/api-base-url';
import { fetchWithTimeout } from '../lib/network-timeout';
import { ResponderRecoverySchema, recoveryPatch } from '../lib/responder-recovery';
import { getResponderEmergencyAlert } from '../lib/push-notifications';
import { useResponderStore } from '../stores/useResponderStore';
import { useResponderDutyStore } from '../stores/useResponderDutyStore';

/** Mounted once in the tab shell: offers remain live on every responder tab. */
export function useResponderRecovery(ownerId: string | null) {
  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    let generation = 0;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isCurrent = () => active && useResponderStore.getState().ownerUserId === ownerId;
    const schedule = (delay = 100) => {
      generation += 1;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = undefined; void reconcile(); }, delay);
    };
    const reconcile = async () => {
      const request = ++generation;
      const initial = useResponderStore.getState();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isCurrent() || session?.user.id !== ownerId) return;
        const response = await fetchWithTimeout(`${getMobileApiBaseUrl()}/api/responder/state`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }, 12_000, 'response recovery');
        const payload = await response.json();
        if (!isCurrent() || request !== generation) return;
        if (!response.ok) throw new Error(payload?.error || 'Unable to refresh your response.');
        const data = ResponderRecoverySchema.parse(payload.data);
        const current = useResponderStore.getState();
        if (current.activeDispatch !== initial.activeDispatch || current.status !== initial.status) {
          schedule();
          return;
        }
        if (data.dispatch && current.submittedIncidentIds.includes(data.dispatch.id)) { schedule(); return; }
        failures = 0;
        useResponderDutyStore.getState().setDutyStatus(data.dutyStatus);
        if (!data.dispatch) {
          if (current.activeDispatch && current.status === 'dispatch_offered') {
            current.releaseDispatchOffer({ incidentId: current.activeDispatch.id, title: 'Dispatch offer released', message: 'This offer expired or was reassigned. Your duty status has been refreshed.' });
          } else if (current.activeDispatch) current.completeIncident(current.activeDispatch.id);
          useResponderStore.setState({ recoveryError: null });
          return;
        }
        const newlyReceived = current.activeDispatch?.id !== data.dispatch.id;
        useResponderStore.setState(recoveryPatch(current, data));
        if (newlyReceived) {
          const alert = getResponderEmergencyAlert(data.dispatch.type);
          void Notifications.scheduleNotificationAsync({
            content: {
              title: data.dispatch.isOffer ? 'Emergency Dispatch Offer' : 'Direct Emergency Dispatch',
              body: `${data.dispatch.type} at ${data.dispatch.locationName}`,
              sound: alert.sound,
              data: { kind: data.dispatch.isOffer ? 'dispatch_offer' : 'active_dispatch', incidentId: data.dispatch.id },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: alert.channelId },
          }).catch(() => undefined);
        }
      } catch {
        if (!isCurrent() || request !== generation) return;
        useResponderStore.setState({ recoveryError: 'Response refresh unavailable. Keeping your last confirmed assignment.' });
        if (AppState.currentState === 'active') schedule(Math.min(30_000, 3_000 * 2 ** Math.min(failures++, 3)));
      }
    };
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') schedule(); });
    const unsubscribe = useResponderStore.subscribe((state, previous) => {
      if (state.status !== previous.status || state.recoveryVersion !== previous.recoveryVersion) schedule();
    });
    const channel = supabase.channel(`responder-recovery-${ownerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `responder_id=eq.${ownerId}` }, () => schedule())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `current_offer_responder_id=eq.${ownerId}` }, () => schedule())
      .subscribe(status => { if (status === 'SUBSCRIBED') schedule(); });
    schedule();
    return () => {
      active = false;
      generation += 1;
      if (timer) clearTimeout(timer);
      foreground.remove();
      unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [ownerId]);
}
