/**
 * Resolves one API origin for every mobile request. Production builds must not
 * fall back to a phone's localhost address: that silently stops telemetry
 * heartbeats and makes an on-duty responder look unavailable to PACC.
 */
export function getMobileApiBaseUrl() {
  const configuredOrigin = process.env.EXPO_PUBLIC_API_URL
    || process.env.EXPO_PUBLIC_MOBILE_API_URL?.replace(/\/api$/, '');
  const fallbackOrigin = process.env.NODE_ENV === 'development'
    ? 'http://10.0.2.2:3000'
    : 'https://disas-trace.vercel.app';

  return (configuredOrigin || fallbackOrigin).replace(/\/$/, '');
}
