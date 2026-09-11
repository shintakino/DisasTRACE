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
  const { data: { session } } = await supabase.auth.getSession();
  const releasePromise = session?.access_token
    ? (async () => {
      try {
        const response = await fetch(`${apiBaseUrl()}/api/mobile-auth/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ deviceId: getMobileDeviceId() }),
      });
      const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.warn('[Mobile auth] Device-session release was not accepted:', payload.error);
        }
      } catch (error) {
        // Local logout must remain available during a poor/offline connection.
        // If the release cannot reach the server, the user is still signed out
        // locally; a server-side binding cannot be released without a network.
        console.warn('[Mobile auth] Device-session release could not be sent:', error);
      }
    })()
    : Promise.resolve();

  // Clear the credential straight away. This is the user-visible logout and
  // must not wait for an Auth-admin/network round trip.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;

  // Give a healthy connection a short chance to release the one-device
  // binding, without allowing a stalled server request to make logout slow.
  await Promise.race([
    releasePromise,
    new Promise<void>((resolve) => setTimeout(resolve, 1200)),
  ]);
}
