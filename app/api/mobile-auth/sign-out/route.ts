import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { mobileDeviceSessions, users } from '@/db/schema';
import { createClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const MobileSignOutSchema = z.object({ deviceId: z.string().trim().min(8).max(256) }).strict();
const mobileRoles = new Set(['public_user', 'ambulance_responder']);

export async function POST(request: Request) {
  try {
    const parsed = MobileSignOutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid sign-out request.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!dbUser || !mobileRoles.has(dbUser.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    await db.delete(mobileDeviceSessions).where(and(
      eq(mobileDeviceSessions.userId, user.id),
      eq(mobileDeviceSessions.deviceHash, createHash('sha256').update(parsed.data.deviceId).digest('hex')),
    ));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile sign-out failed:', error);
    return NextResponse.json({ error: 'Unable to sign out right now.' }, { status: 500 });
  }
}
