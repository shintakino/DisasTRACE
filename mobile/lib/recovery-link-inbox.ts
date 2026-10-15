import { getRecoveryCredentials } from './recovery-session';

const MOBILE_RECOVERY_URL = /^disastrace:\/\/\/?reset-password(?:[/?#]|$)/i;

let pendingRecoveryUrl: string | null = null;

/**
 * Retains a valid password-recovery deep link while Expo Router mounts the
 * target screen. The value intentionally remains in process memory only: it
 * can contain one-time credentials and must not survive an app restart.
 */
export function rememberRecoveryUrl(url: string | null | undefined): boolean {
  if (!url || !MOBILE_RECOVERY_URL.test(url) || !getRecoveryCredentials(url, {})) {
    return false;
  }

  pendingRecoveryUrl = url;
  return true;
}

export function getRememberedRecoveryUrl(): string | null {
  return pendingRecoveryUrl;
}

export function clearRememberedRecoveryUrl(): void {
  pendingRecoveryUrl = null;
}
