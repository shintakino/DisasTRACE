export interface RecoveryCredentials {
  kind: 'tokens' | 'code';
  accessToken?: string;
  refreshToken?: string;
  code?: string;
}

type RecoveryParameter = string | string[] | undefined;

function firstValue(value: RecoveryParameter): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function valueFromUrl(url: string | null | undefined, key: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(new RegExp(`(?:[?#&])${key}=([^&#]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

/** Extracts a Supabase recovery credential without trusting any existing app session. */
export function getRecoveryCredentials(
  url: string | null | undefined,
  params: {
    access_token?: RecoveryParameter;
    refresh_token?: RecoveryParameter;
    code?: RecoveryParameter;
    '#'?: RecoveryParameter;
  },
): RecoveryCredentials | null {
  // Expo Router represents an incoming URL fragment as the reserved "#"
  // parameter. Android recovery links commonly contain the tokens there.
  const routerHash = firstValue(params['#']);
  const hashUrl = routerHash ? `#${routerHash.replace(/^#/, '')}` : null;
  const accessToken = firstValue(params.access_token) || valueFromUrl(url, 'access_token') || valueFromUrl(hashUrl, 'access_token');
  const refreshToken = firstValue(params.refresh_token) || valueFromUrl(url, 'refresh_token') || valueFromUrl(hashUrl, 'refresh_token');
  const code = firstValue(params.code) || valueFromUrl(url, 'code') || valueFromUrl(hashUrl, 'code');

  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }
  return code ? { kind: 'code', code } : null;
}
