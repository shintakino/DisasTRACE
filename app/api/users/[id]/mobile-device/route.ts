import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs, mobileDeviceSessions, mobilePushTokens, users } from '@/db/schema';
import { getUserRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase-server';

const UserIdSchema = z.string().uuid();
const MOBILE_ROLES = new Set(['public_user', 'ambulance_responder']);

/**
 * CDRRMO recovery control. It removes the app-level session binding so the
 * account can sign in on a replacement device; it does not affect web admins.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!UserIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (await getUserRole() !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
    }

    const target = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true, fullName: true, role: true },
    });
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    if (!MOBILE_ROLES.has(target.role)) {
      return NextResponse.json({ error: 'Only Public User and Responder accounts have mobile devices to release.' }, { status: 400 });
    }

    const released = await db.delete(mobileDeviceSessions)
      .where(eq(mobileDeviceSessions.userId, target.id))
      .returning({ userId: mobileDeviceSessions.userId });

    if (released.length) {
      await db.delete(mobilePushTokens).where(eq(mobilePushTokens.userId, target.id));
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.id,
        action: `MOBILE_SESSION_RELEASED for ${target.fullName}`,
        entityType: 'MOBILE_SESSION',
        entityId: target.id,
      });
    }

    return NextResponse.json({
      success: true,
      released: released.length > 0,
      message: released.length ? 'Mobile device released. The user may sign in on a replacement device.' : 'No active mobile device was registered for this account.',
    });
  } catch (error) {
    console.error('Unable to release mobile device:', error);
    return NextResponse.json({ error: 'Unable to release the mobile device.' }, { status: 500 });
  }
}
