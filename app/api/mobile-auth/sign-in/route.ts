import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs, mobileDeviceSessions, users } from '@/db/schema';
import { getSupabaseSessionId, MOBILE_ROLES } from '@/lib/mobile-session';

export const runtime = 'nodejs';

const MobileSignInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(512),
  deviceId: z.string().trim().min(8).max(256),
}).strict();

const alreadyActiveMessage = 'Account already logged in to different device. Log out of the first device before signing in on this device.';

function deviceHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function createSessionClient(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

async function revokeSession(accessToken: string, scope: 'local' | 'others') {
  // Server clients do not hydrate a persisted auth session from global
  // headers, so pass the verified bearer explicitly to Auth's logout API.
  const { error } = await createSessionClient(accessToken).auth.admin.signOut(accessToken, scope);
  if (error) throw error;
}

export async function POST(request: Request) {
  try {
    const parsed = MobileSignInSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid sign-in request.' }, { status: 400 });
    }

    const auth = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { data, error } = await auth.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });
    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: error?.message || 'Invalid email or password.' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, data.user.id) });
    if (!dbUser || !MOBILE_ROLES.has(dbUser.role)) {
      await revokeSession(data.session.access_token, 'local').catch(() => undefined);
      return NextResponse.json({ error: 'This account is not permitted to use the mobile application.' }, { status: 403 });
    }

    const sessionId = getSupabaseSessionId(data.session.access_token);
    if (!sessionId) {
      await revokeSession(data.session.access_token, 'local').catch(() => undefined);
      return NextResponse.json({ error: 'Unable to establish a secure mobile session.' }, { status: 503 });
    }

    const now = new Date();
    const hashedDeviceId = deviceHash(parsed.data.deviceId);
    const claimed = await db.insert(mobileDeviceSessions)
      .values({ userId: dbUser.id, deviceHash: hashedDeviceId, activeSessionId: sessionId, createdAt: now, lastSeenAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: mobileDeviceSessions.userId,
        set: { activeSessionId: sessionId, lastSeenAt: now, updatedAt: now },
        // A conflicting record can only be renewed by the same device.
        where: eq(mobileDeviceSessions.deviceHash, hashedDeviceId),
      })
      .returning({ userId: mobileDeviceSessions.userId });

    if (claimed.length === 0) {
      await revokeSession(data.session.access_token, 'local').catch(() => undefined);
      await db.insert(auditLogs).values({
        id: randomUUID(), userId: dbUser.id, action: 'MOBILE_SESSION_REJECTED', entityType: 'MOBILE_SESSION', entityId: dbUser.id,
      });
      return NextResponse.json({ code: 'MOBILE_DEVICE_ALREADY_ACTIVE', error: alreadyActiveMessage }, { status: 409 });
    }

    try {
      // A fresh successful mobile sign-in makes every other Supabase session
      // for this mobile account unusable as well as replacing the DB binding.
      await revokeSession(data.session.access_token, 'others');
    } catch (revokeError) {
      await db.delete(mobileDeviceSessions).where(eq(mobileDeviceSessions.activeSessionId, sessionId));
      await revokeSession(data.session.access_token, 'local').catch(() => undefined);
      console.error('Unable to revoke previous mobile sessions:', revokeError);
      return NextResponse.json({ error: 'Unable to establish a secure mobile session.' }, { status: 503 });
    }

    await db.insert(auditLogs).values({
      id: randomUUID(), userId: dbUser.id, action: 'MOBILE_SESSION_ESTABLISHED', entityType: 'MOBILE_SESSION', entityId: dbUser.id,
    });

    return NextResponse.json({
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error('Mobile sign-in failed:', error);
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 });
  }
}
