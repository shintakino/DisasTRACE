import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

interface ResponderEmergencyAlert {
  channelId: string;
  channelName: string;
  sound: string;
  vibrationPattern: number[];
}

export interface ResponderPushRegistrationResult {
  registered: boolean;
  message: string;
}

const GENERIC_EMERGENCY_ALERT: ResponderEmergencyAlert = {
  channelId: 'emergency-alerts',
  channelName: 'Emergency Alerts',
  sound: 'default',
  vibrationPattern: [0, 250, 250, 250, 250, 250],
};

const TYPE_SPECIFIC_EMERGENCY_ALERTS: Record<string, ResponderEmergencyAlert> = {
  fire: {
    channelId: 'responder-fire-alerts',
    channelName: 'Fire emergency alerts',
    sound: 'responder_fire_alert.wav',
    vibrationPattern: [0, 300, 120, 300, 120, 300],
  },
  medical: {
    channelId: 'responder-medical-alerts',
    channelName: 'Medical emergency alerts',
    sound: 'responder_medical_alert.wav',
    vibrationPattern: [0, 220, 140, 220, 140, 220],
  },
  collision: {
    channelId: 'responder-collision-alerts',
    channelName: 'Vehicular collision alerts',
    sound: 'responder_collision_alert.wav',
    vibrationPattern: [0, 350, 100, 220],
  },
  flood: {
    channelId: 'responder-flood-alerts',
    channelName: 'Flood and water emergency alerts',
    sound: 'responder_flood_alert.wav',
    vibrationPattern: [0, 260, 170, 260],
  },
  general: {
    channelId: 'responder-general-alerts',
    channelName: 'General emergency alerts',
    sound: 'responder_general_alert.wav',
    vibrationPattern: [0, 250, 150, 250],
  },
};

export function getResponderEmergencyAlert(emergencyType: string | null | undefined): ResponderEmergencyAlert {
  const normalized = emergencyType?.toLocaleLowerCase('en-PH') ?? '';
  if (normalized.includes('fire') || normalized.includes('explosion')) return TYPE_SPECIFIC_EMERGENCY_ALERTS.fire;
  if (normalized.includes('medical')) return TYPE_SPECIFIC_EMERGENCY_ALERTS.medical;
  if (normalized.includes('vehicular') || normalized.includes('collision') || normalized.includes('accident')) return TYPE_SPECIFIC_EMERGENCY_ALERTS.collision;
  if (normalized.includes('flood') || normalized.includes('water')) return TYPE_SPECIFIC_EMERGENCY_ALERTS.flood;
  return TYPE_SPECIFIC_EMERGENCY_ALERTS.general;
}

export async function ensureResponderEmergencyAlertChannels() {
  if (Platform.OS !== 'android') return;
  const alerts = [GENERIC_EMERGENCY_ALERT, ...Object.values(TYPE_SPECIFIC_EMERGENCY_ALERTS)];
  await Promise.all(alerts.map((alert) => Notifications.setNotificationChannelAsync(alert.channelId, {
    name: alert.channelName,
    importance: Notifications.AndroidImportance.MAX,
    sound: alert.sound,
    vibrationPattern: alert.vibrationPattern,
    lightColor: '#EF4444',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  })));
}

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

export async function registerResponderPushNotifications(): Promise<ResponderPushRegistrationResult> {
  if (Platform.OS !== 'android') {
    return { registered: false, message: 'Dispatch alerts require the Android responder app.' };
  }
  await ensureResponderEmergencyAlertChannels();
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') {
    return {
      registered: false,
      message: 'Notifications are off. Keep DisasTRACE open for live offers, or enable notifications to receive offers in the background.',
    };
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Expo project ID is missing.');
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await postCurrentPushToken(pushToken);
  return { registered: true, message: 'Dispatch alerts are enabled for this device.' };
}

export function subscribeToPushTokenChanges() {
  return Notifications.addPushTokenListener((token) => {
    postCurrentPushToken(token.data).catch((error) => {
      console.warn('[Push] Unable to refresh the responder push token.', error);
    });
  });
}
