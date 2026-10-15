import { NextResponse } from 'next/server';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { mobilePushTokens, users } from '@/db/schema';
import { getBearerToken, getMobileSessionState, getSupabaseSessionId } from '@/lib/mobile-session';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const PushTokenSchema = z.object({
  pushToken: z.string().trim().regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/, 'Invalid Expo push token.'),
}).strict();

async function requireActiveMobileUser(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const session = await getMobileSessionState(user.id, accessToken);
  if (!session.exists || !session.mobile || !session.active) return null;

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, status: true, verificationStatus: true },
  });
  const sessionId = getSupabaseSessionId(accessToken);
  const supportsAnnouncements = dbUser?.role === 'ambulance_responder' || dbUser?.role === 'public_user';
  if (!dbUser || !supportsAnnouncements || dbUser.status !== 'ACTIVE' || dbUser.verificationStatus !== 'APPROVED' || !sessionId) return null;
  return { userId: user.id, sessionId };
}

export async function POST(request: Request) {
  try {
    const parsed = PushTokenSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid push-token request.' }, { status: 400 });
    const mobileUser = await requireActiveMobileUser(request);
    if (!mobileUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    await db.transaction(async (tx) => {
      // Expo identifies the installation, not the account. If a user changes
      // accounts on one Android device, transfer the token rather than failing
      // the new account's registration on the unique push-token constraint.
      await tx.delete(mobilePushTokens).where(and(
        eq(mobilePushTokens.pushToken, parsed.data.pushToken),
        ne(mobilePushTokens.userId, mobileUser.userId),
      ));
      await tx.insert(mobilePushTokens).values({
        userId: mobileUser.userId,
        pushToken: parsed.data.pushToken,
        sessionId: mobileUser.sessionId,
        platform: 'android',
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: mobilePushTokens.userId,
        set: { pushToken: parsed.data.pushToken, sessionId: mobileUser.sessionId, updatedAt: now },
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unable to register mobile push token:', error);
    return NextResponse.json({ error: 'Unable to register this device for dispatch alerts.' }, { status: 500 });
  }
}
