import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs, mobileDeviceSessions, mobilePushTokens, users } from '@/db/schema';
import { createClient } from '@/lib/supabase-server';
import { getBearerToken, getSupabaseSessionId, MOBILE_ROLES } from '@/lib/mobile-session';

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
    const sessionId = getSupabaseSessionId(accessToken);
    if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const account = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { role: true } });
    if (!account || !MOBILE_ROLES.has(account.role)) return NextResponse.json({ error: 'Mobile account required.' }, { status: 403 });

    const deviceHash = createHash('sha256').update(parsed.data.deviceId).digest('hex');
    const released = await db.transaction(async tx => {
      const [binding] = await tx.select().from(mobileDeviceSessions)
        .where(eq(mobileDeviceSessions.userId, user.id)).for('update');
      // Missing/replaced bindings confirm that this authenticated session is
      // already released. Never delete the replacement device's reservation.
      if (binding?.activeSessionId === sessionId && binding.deviceHash !== deviceHash) return false;
      if (binding?.activeSessionId === sessionId) {
        await tx.delete(mobileDeviceSessions).where(and(
          eq(mobileDeviceSessions.userId, user.id),
          eq(mobileDeviceSessions.deviceHash, deviceHash),
          eq(mobileDeviceSessions.activeSessionId, sessionId),
        ));
        await tx.insert(auditLogs).values({
          id: randomUUID(), userId: user.id, action: 'MOBILE_SESSION_ENDED', entityType: 'MOBILE_SESSION', entityId: user.id,
        });
      }
      await tx.delete(mobilePushTokens).where(and(
        eq(mobilePushTokens.userId, user.id),
        eq(mobilePushTokens.sessionId, sessionId),
      ));
      return true;
    });
    if (!released) return NextResponse.json({ error: 'This device does not own the mobile session.' }, { status: 409 });
    // The mobile client's local-scope Auth signOut revokes its refresh token
    // after this acknowledgement. Deferring revocation keeps a lost-response
    // retry authenticatable; RLS/proxy already deny the released binding.
    return NextResponse.json({ success: true, released: true });
  } catch (error) {
    console.error('Mobile sign-out failed:', error);
    return NextResponse.json({ error: 'Unable to sign out right now.' }, { status: 500 });
  }
}
