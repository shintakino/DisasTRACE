import { supabase } from './supabase';
import { getMobileDeviceId } from './mobile-device';
import { getMobileApiBaseUrl } from './api-base-url';

const MOBILE_SIGN_OUT_TIMEOUT_MS = 8_000;

export class MobileSignInError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'MobileSignInError';
  }
}

export async function verifyMobileSession(accessToken: string): Promise<boolean> {
  const response = await fetch(`${getMobileApiBaseUrl()}/api/mobile-auth/session`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error('Unable to verify the mobile session.');
  const payload = await response.json().catch(() => ({}));
  return payload.active === true;
}

/** Binds the session automatically created during registration before ID upload. */
export async function bindCurrentMobileSession(accessToken: string) {
  const response = await fetch(`${getMobileApiBaseUrl()}/api/mobile-auth/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ deviceId: getMobileDeviceId() }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Unable to establish a secure mobile session.');
}

export async function signInOnMobile(email: string, password: string, replaceExistingDevice = false) {
  const response = await fetch(`${getMobileApiBaseUrl()}/api/mobile-auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, deviceId: getMobileDeviceId(), replaceExistingDevice }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new MobileSignInError(payload.error || 'Unable to sign in right now.', payload.code);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MOBILE_SIGN_OUT_TIMEOUT_MS);
    try {
      const response = await fetch(`${getMobileApiBaseUrl()}/api/mobile-auth/sign-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ deviceId: getMobileDeviceId() }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.released !== true) {
        throw new Error(payload.error || 'Secure sign out could not be confirmed. Please try again while connected.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Secure sign out timed out. Please check your connection and try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // The server has confirmed the binding is gone, so a replacement device can
  // sign in immediately without briefly allowing two active mobile sessions.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
