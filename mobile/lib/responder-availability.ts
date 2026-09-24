import * as Location from 'expo-location';
import { isMockedLocation, MOCK_LOCATION_MESSAGE } from './location-integrity';
import { supabase } from './supabase';
import { getMobileApiBaseUrl } from './api-base-url';

export interface ResponderAvailabilitySyncResult {
  success: boolean;
  message: string;
}

function getCurrentPositionWithTimeout() {
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('GPS_TIMEOUT')), 10_000);
    }),
  ]);
}

/** Publish one trusted GPS heartbeat before a responder enters the dispatch pool. */
export async function syncResponderAvailabilityLocation(): Promise<ResponderAvailabilitySyncResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return {
      success: false,
      message: 'Location permission is required before PACC can offer you an emergency. Enable precise location and try again.',
    };
  }

  let location: Location.LocationObject;
  try {
    location = await getCurrentPositionWithTimeout();
  } catch {
    return {
      success: false,
      message: 'Unable to obtain a current GPS position. Move to an open area, check device location, then retry GPS sync.',
    };
  }

  if (isMockedLocation(location)) return { success: false, message: MOCK_LOCATION_MESSAGE };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { success: false, message: 'Your session expired. Sign in again before going on duty.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${getMobileApiBaseUrl()}/api/responder/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        isMockedLocation: false,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as { success?: boolean; held?: boolean; message?: string; error?: string } | null;
    if (!response.ok) {
      return {
        success: false,
        message: payload?.message || payload?.error || 'PACC could not confirm your GPS location. Check your signal and try again.',
      };
    }
    if (payload?.success === false || payload?.held) {
      return {
        success: false,
        message: payload?.message || 'PACC could not confirm a trusted GPS location. Check device location and try again.',
      };
    }
    return { success: true, message: 'GPS synced. You are available for emergency offers.' };
  } catch {
    return {
      success: false,
      message: 'GPS sync could not reach PACC. You are still Off Duty; check your connection and retry GPS sync.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
