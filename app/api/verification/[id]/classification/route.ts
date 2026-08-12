import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';

const ClassificationSchema = z.object({
  triageClassification: z.enum(['HIGH_CONFIDENCE_EMERGENCY', 'HIGH_CONFIDENCE_NON_EMERGENCY', 'UNCERTAIN_INCOMPLETE', 'SUSPICIOUS_POSSIBLE_PRANK']),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.role !== 'pacc_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = ClassificationSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: 'Invalid classification.' }, { status: 400 });
  const { id } = await params;
  const [updated] = await db.update(verificationRequests).set({
    triageClassification: payload.data.triageClassification,
    triageReasons: ['PACC manually overrode the automated classification.'],
    updatedAt: new Date(),
  }).where(eq(verificationRequests.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  return NextResponse.json({ data: updated });
}
