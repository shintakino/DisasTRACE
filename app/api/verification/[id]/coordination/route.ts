import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';

const CoordinationSchema = z.object({
  agencies: z.array(z.enum(['PNP', 'BFP', 'CDRRMO', 'Barangay', 'DSWD', 'Hospital'])).max(6),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.role !== 'pacc_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payload = CoordinationSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: 'Invalid coordination agencies.' }, { status: 400 });
  const { id } = await params;
  const [updated] = await db.update(verificationRequests).set({
    coordinationAgencies: payload.data.agencies,
    updatedAt: new Date(),
  }).where(eq(verificationRequests.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  return NextResponse.json({ data: updated });
}
