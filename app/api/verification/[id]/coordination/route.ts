import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { auditLogs } from '@/db/schema/audit_logs';
import { createAuditActor, createAuditEvent, PACC_AUDIT_ACTIONS } from '@/lib/audit-events';

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
  const existingRequest = await db.query.verificationRequests.findFirst({ where: eq(verificationRequests.id, id) });
  if (!existingRequest) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (existingRequest.status === 'REJECTED' || existingRequest.status === 'DUPLICATE') {
    return NextResponse.json({ error: 'Rejected or duplicate report coordination cannot be changed.' }, { status: 409 });
  }
  const existingIncident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, id) });
  if (existingIncident?.status === 'RESOLVED') {
    return NextResponse.json({ error: 'Case Closed reports cannot be changed.' }, { status: 409 });
  }
  const [updated] = await db.transaction(async (tx) => {
    const updatedRows = await tx.update(verificationRequests).set({
      coordinationAgencies: payload.data.agencies,
      updatedAt: new Date(),
    }).where(eq(verificationRequests.id, id)).returning();
    await tx.insert(auditLogs).values(createAuditEvent({
      actor: createAuditActor(user),
      action: PACC_AUDIT_ACTIONS.coordination,
      entityType: 'VERIFICATION_REQUEST',
      entityId: id,
      details: { requestId: existingRequest.requestId, before: existingRequest.coordinationAgencies, after: payload.data.agencies },
    }));
    return updatedRows;
  });
  if (!updated) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  return NextResponse.json({ data: updated });
}
