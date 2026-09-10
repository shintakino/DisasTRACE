import { supabase } from './supabase';
import { getMobileDeviceId } from './mobile-device';

const apiBaseUrl = () => (process.env.EXPO_PUBLIC_API_URL
  || process.env.EXPO_PUBLIC_MOBILE_API_URL?.replace(new RegExp('/api$'), '')
  || 'http://10.0.2.2:3000').replace(new RegExp('/$'), '');

export async function verifyMobileSession(accessToken: string): Promise<boolean> {
  const response = await fetch(`${apiBaseUrl()}/api/mobile-auth/session`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error('Unable to verify the mobile session.');
  const payload = await response.json().catch(() => ({}));
  return payload.active === true;
}

/** Binds the session automatically created during registration before ID upload. */
export async function bindCurrentMobileSession(accessToken: string) {
  const response = await fetch(`${apiBaseUrl()}/api/mobile-auth/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ deviceId: getMobileDeviceId() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to establish a secure mobile session.');
}

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
  let serverError: Error | null = null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    try {
      const response = await fetch(`${apiBaseUrl()}/api/mobile-auth/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ deviceId: getMobileDeviceId() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) serverError = new Error(payload.error || 'Unable to complete sign out.');
    } catch (error) {
      serverError = error instanceof Error ? error : new Error('Unable to complete sign out.');
    }
  }
  // Clearing the local credential is always safe, including when this device
  // was already released by an administrator or replaced by a newer login.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
  if (serverError) throw serverError;
}
