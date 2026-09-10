import { supabase } from './supabase';
import { getMobileDeviceId } from './mobile-device';

const apiBaseUrl = () => (process.env.EXPO_PUBLIC_API_URL
  || process.env.EXPO_PUBLIC_MOBILE_API_URL?.replace(new RegExp('/api$'), '')
  || 'http://10.0.2.2:3000').replace(new RegExp('/$'), '');

export async function signInOnMobile(email: string, password: string) {
  const response = await fetch(`${apiBaseUrl()}/api/mobile-auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId: getMobileDeviceId() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to sign in right now.');
  const result = await supabase.auth.setSession({
    access_token: payload.data.accessToken,
    refresh_token: payload.data.refreshToken,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function signOutFromMobile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    const response = await fetch(`${apiBaseUrl()}/api/mobile-auth/sign-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ deviceId: getMobileDeviceId() }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Unable to complete sign out.');
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
