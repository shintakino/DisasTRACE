import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { mobileDeviceSessions, users } from '@/db/schema';

export const runtime = 'nodejs';

const MobileSignInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(512),
  deviceId: z.string().trim().min(8).max(256),
}).strict();

const mobileRoles = new Set(['public_user', 'ambulance_responder']);
const alreadyActiveMessage = 'Account already logged in to different device. Log out of the first device before signing in on this device.';

function deviceHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
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
    if (!dbUser || !mobileRoles.has(dbUser.role)) {
      return NextResponse.json({ error: 'This account is not permitted to use the mobile application.' }, { status: 403 });
    }

    const now = new Date();
    const claimed = await db.insert(mobileDeviceSessions)
      .values({ userId: dbUser.id, deviceHash: deviceHash(parsed.data.deviceId), createdAt: now, lastSeenAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: mobileDeviceSessions.userId,
        set: { lastSeenAt: now, updatedAt: now },
        // A conflicting record can only be renewed by the same device.
        where: eq(mobileDeviceSessions.deviceHash, deviceHash(parsed.data.deviceId)),
      })
      .returning({ userId: mobileDeviceSessions.userId });

    if (claimed.length === 0) {
      return NextResponse.json({ code: 'MOBILE_DEVICE_ALREADY_ACTIVE', error: alreadyActiveMessage }, { status: 409 });
    }

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
