import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs, mobileDeviceSessions } from '@/db/schema';
import { createClient } from '@/lib/supabase-server';
import { getBearerToken, getMobileSessionState, getSupabaseSessionId } from '@/lib/mobile-session';

export const runtime = 'nodejs';

const BindSchema = z.object({ deviceId: z.string().trim().min(8).max(256) }).strict();
const alreadyActiveMessage = 'Account already logged in to different device. Log out of the first device before signing in on this device.';

/** Binds an automatically-created registration session before its first upload. */
export async function POST(request: Request) {
  try {
    const parsed = BindSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid mobile session request.' }, { status: 400 });

    const accessToken = getBearerToken(request);
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const state = await getMobileSessionState(user.id, accessToken);
    if (!state.exists || !state.mobile) return NextResponse.json({ error: 'This account is not permitted to use the mobile application.' }, { status: 403 });
    const sessionId = getSupabaseSessionId(accessToken);
    if (!sessionId) return NextResponse.json({ error: 'Unable to establish a secure mobile session.' }, { status: 503 });

    const now = new Date();
    const deviceHash = createHash('sha256').update(parsed.data.deviceId).digest('hex');
    const claimed = await db.insert(mobileDeviceSessions)
      .values({ userId: user.id, deviceHash, activeSessionId: sessionId, createdAt: now, lastSeenAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: mobileDeviceSessions.userId,
        set: { activeSessionId: sessionId, lastSeenAt: now, updatedAt: now },
        where: eq(mobileDeviceSessions.deviceHash, deviceHash),
      })
      .returning({ userId: mobileDeviceSessions.userId });

    if (!claimed.length) {
      await supabase.auth.admin.signOut(accessToken, 'local').catch(() => undefined);
      return NextResponse.json({ code: 'MOBILE_DEVICE_ALREADY_ACTIVE', error: alreadyActiveMessage }, { status: 409 });
    }
    await db.insert(auditLogs).values({
      id: randomUUID(), userId: user.id, action: 'MOBILE_SESSION_BOUND', entityType: 'MOBILE_SESSION', entityId: user.id,
    });
    return NextResponse.json({ active: true });
  } catch (error) {
    console.error('Mobile session bind failed:', error);
    return NextResponse.json({ error: 'Unable to establish a secure mobile session.' }, { status: 500 });
  }
}
