import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs, mobileDeviceSessions, mobilePushTokens } from '@/db/schema';
import { createClient } from '@/lib/supabase-server';
import { getBearerToken, getMobileSessionState, getSupabaseSessionId } from '@/lib/mobile-session';

export const runtime = 'nodejs';

const MobileSignOutSchema = z.object({ deviceId: z.string().trim().min(8).max(256) }).strict();
export async function POST(request: Request) {
  try {
    const parsed = MobileSignOutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid sign-out request.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = getBearerToken(request);
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const state = await getMobileSessionState(user.id, accessToken);
    if (!state.exists || !state.mobile) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const sessionId = getSupabaseSessionId(accessToken);
    if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deleted = await db.delete(mobileDeviceSessions).where(and(
      eq(mobileDeviceSessions.userId, user.id),
      eq(mobileDeviceSessions.deviceHash, createHash('sha256').update(parsed.data.deviceId).digest('hex')),
      eq(mobileDeviceSessions.activeSessionId, sessionId),
    )).returning({ userId: mobileDeviceSessions.userId });
    if (deleted.length) {
      await db.delete(mobilePushTokens).where(and(
        eq(mobilePushTokens.userId, user.id),
        eq(mobilePushTokens.sessionId, sessionId),
      ));
      await db.insert(auditLogs).values({
        id: randomUUID(), userId: user.id, action: 'MOBILE_SESSION_ENDED', entityType: 'MOBILE_SESSION', entityId: user.id,
      });
    }
    // Revoke the refresh token at the Auth boundary too. RLS/proxy already
    // deny this JWT once the binding is removed, even before it expires.
    const { error: revokeError } = await supabase.auth.admin.signOut(accessToken, 'local');
    if (revokeError) console.warn('Supabase local session revocation failed after binding removal:', revokeError);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile sign-out failed:', error);
    return NextResponse.json({ error: 'Unable to sign out right now.' }, { status: 500 });
  }
}
