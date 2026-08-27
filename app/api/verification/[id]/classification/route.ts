import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { autoDispatchIncident } from '@/lib/dispatch-engine';

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
  const existingRequest = await db.query.verificationRequests.findFirst({
    where: eq(verificationRequests.id, id),
  });
  if (!existingRequest) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (existingRequest.status === 'REJECTED' || existingRequest.status === 'DUPLICATE') {
    return NextResponse.json({ error: 'Closed reports cannot be reclassified.' }, { status: 409 });
  }

  const nature = payload.data.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY'
    ? 'EMERGENCY'
    : payload.data.triageClassification === 'HIGH_CONFIDENCE_NON_EMERGENCY'
      ? 'NON-EMERGENCY'
      : existingRequest.nature;
  const [updated] = await db.update(verificationRequests).set({
    triageClassification: payload.data.triageClassification,
    triageReasons: ['PACC manually overrode the automated classification.'],
    nature,
    updatedAt: new Date(),
  }).where(eq(verificationRequests.id, id)).returning();

  let incident = (await db.query.incidents.findFirst({
    where: eq(incidents.requestId, id),
  })) ?? null;
  let autoDispatched = false;

  // An override to a high-confidence emergency is the explicit point at which
  // automated dispatch may begin. If no unit is available, the request remains
  // PENDING and PACC can dispatch it manually; it is never lost or forced into
  // a merge flow.
  if (
    payload.data.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY' &&
    updated.status === 'PENDING' &&
    !incident
  ) {
    incident = await autoDispatchIncident(
      id,
      updated.residentId,
      updated.latitude,
      updated.longitude,
    );
    autoDispatched = Boolean(incident);
  }

  return NextResponse.json({ data: updated, incident, autoDispatched });
}
