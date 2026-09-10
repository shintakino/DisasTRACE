import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { mobileDeviceSessions, users } from '@/db/schema';

export const MOBILE_ROLES = new Set(['public_user', 'ambulance_responder']);
export const MOBILE_SESSION_INVALID_CODE = 'MOBILE_SESSION_INVALID';

type JwtClaims = { sub?: unknown; session_id?: unknown };

/**
 * Extracts only the stable session identifier from a Supabase access token.
 * The caller must authenticate the token with Supabase before relying on this
 * value for authorization.
 */
export function getSupabaseSessionId(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as JwtClaims;
    const sessionId = typeof claims.session_id === 'string' ? claims.session_id : null;
    const subject = typeof claims.sub === 'string' ? claims.sub : null;
    return sessionId && subject ? sessionId : null;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

export async function hasActiveMobileSession(userId: string, accessToken: string) {
  const sessionId = getSupabaseSessionId(accessToken);
  if (!sessionId) return false;

  const session = await db.query.mobileDeviceSessions.findFirst({
    where: and(
      eq(mobileDeviceSessions.userId, userId),
      eq(mobileDeviceSessions.activeSessionId, sessionId),
    ),
    columns: { userId: true },
  });
  return Boolean(session);
}

export async function getMobileSessionState(userId: string, accessToken: string) {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, role: true },
  });
  if (!dbUser) return { exists: false, mobile: false, active: false };
  if (!MOBILE_ROLES.has(dbUser.role)) return { exists: true, mobile: false, active: true };

  return {
    exists: true,
    mobile: true,
    active: await hasActiveMobileSession(userId, accessToken),
  };
}
