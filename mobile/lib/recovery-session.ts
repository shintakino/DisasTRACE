export interface RecoveryCredentials {
  kind: 'tokens' | 'code';
  accessToken?: string;
  refreshToken?: string;
  code?: string;
}

function valueFromUrl(url: string | null | undefined, key: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(new RegExp(`(?:[?#&])${key}=([^&#]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** Extracts a Supabase recovery credential without trusting any existing app session. */
export function getRecoveryCredentials(
  url: string | null | undefined,
  params: { access_token?: string; refresh_token?: string; code?: string },
): RecoveryCredentials | null {
  const accessToken = params.access_token || valueFromUrl(url, 'access_token');
  const refreshToken = params.refresh_token || valueFromUrl(url, 'refresh_token');
  const code = params.code || valueFromUrl(url, 'code');

  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }
  return code ? { kind: 'code', code } : null;
}
