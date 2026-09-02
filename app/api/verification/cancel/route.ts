import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { createClient } from '@/lib/supabase-server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });

    const [updated] = await db.update(verificationRequests)
      .set({ status: 'REJECTED' })
      .where(and(
        eq(verificationRequests.id, body.id),
        eq(verificationRequests.residentId, user.id),
        eq(verificationRequests.status, 'PENDING'),
      ))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Request not found or cannot be cancelled' }, { status: 404 });
    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error('Error in PATCH /api/verification/cancel:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
