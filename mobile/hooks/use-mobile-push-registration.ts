import { useEffect } from 'react';
import { AppState } from 'react-native';
import { registerMobilePushNotifications, subscribeToPushTokenChanges, type MobilePushRole } from '../lib/push-notifications';
import { usePushRegistrationStore } from '../store/use-push-registration-store';

/** One registration owner, with bounded retries and foreground recovery. */
export function useMobilePushRegistration(userId: string | null, role: MobilePushRole | null, sessionKey: string | null) {
  const retryVersion = usePushRegistrationStore(state => state.retryVersion);
  useEffect(() => {
    if (!userId || !role || !sessionKey) {
      usePushRegistrationStore.setState({ ownerId: null, status: 'checking', message: 'Sign in to enable phone alerts.' });
      return;
    }
    let active = true;
    let running = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const retryLater = () => {
      if (!active || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (AppState.currentState === 'active') void register();
      }, Math.min(60_000, 5_000 * 2 ** Math.min(failures++, 4)));
    };
    const register = async () => {
      if (!active || running) return;
      running = true;
      try {
        const result = await registerMobilePushNotifications(role, userId);
        if (!active) return;
        failures = 0;
        usePushRegistrationStore.setState({
          ownerId: userId,
          status: result.registered ? 'ready' : 'disabled',
          message: result.message,
        });
      } catch {
        if (!active) return;
        usePushRegistrationStore.setState({
          ownerId: userId,
          status: 'retrying',
          message: 'Phone alerts are not connected yet. We will retry automatically. Saved notices remain available in Notifications.',
        });
        retryLater();
      } finally {
        running = false;
      }
    };
    usePushRegistrationStore.setState({ ownerId: userId, status: 'checking', message: 'Connecting phone alerts…' });
    void register();
    const tokenSubscription = subscribeToPushTokenChanges(userId, retryLater);
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') void register();
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      tokenSubscription.remove();
      foreground.remove();
    };
  }, [userId, role, sessionKey, retryVersion]);
}
