import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const apiBaseUrl = () => (process.env.EXPO_PUBLIC_API_URL
  || process.env.EXPO_PUBLIC_MOBILE_API_URL?.replace(/\/api$/, '')
  || 'http://10.0.2.2:3000').replace(/\/$/, '');

async function postCurrentPushToken(pushToken: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;
  const response = await fetch(`${apiBaseUrl()}/api/mobile-push-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ pushToken }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Unable to register this device for dispatch alerts.');
  }
}

export async function registerResponderPushNotifications() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('emergency-alerts', {
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250, 250, 250],
    lightColor: '#EF4444',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Expo project ID is missing.');
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await postCurrentPushToken(pushToken);
}

export function subscribeToPushTokenChanges() {
  return Notifications.addPushTokenListener((token) => {
    postCurrentPushToken(token.data).catch((error) => {
      console.warn('[Push] Unable to refresh the responder push token.', error);
    });
  });
}
