import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { auditLogs } from '@/db/schema/audit_logs';
import { verificationRequests } from '@/db/schema/verification_requests';
import { users } from '@/db/schema/users';
import { createClient } from '@/lib/supabase-server';
import { createAuditActor, createAuditEvent, PACC_AUDIT_ACTIONS } from '@/lib/audit-events';

const RelatedReportDecisionSchema = z.object({
  action: z.enum(['CONFIRM_LINK', 'KEEP_SEPARATE']),
}).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = RelatedReportDecisionSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: 'Choose whether to link this related report or keep it separate.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!dbUser || (dbUser.role !== 'pacc_admin' && dbUser.role !== 'cdrrmo_super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await db.transaction(async (tx) => {
      const [candidate] = await tx.select()
        .from(verificationRequests)
        .where(eq(verificationRequests.id, id))
        .limit(1)
        .for('update');
      if (!candidate || !candidate.possibleDuplicateOfId) {
        return { status: 409 as const, error: 'This report is no longer awaiting a related-report decision.' };
      }

      const [parent] = await tx.select()
        .from(verificationRequests)
        .where(eq(verificationRequests.id, candidate.possibleDuplicateOfId))
        .limit(1)
        .for('update');
      if (!parent) return { status: 409 as const, error: 'The primary request is no longer available.' };

      if (payload.data.action === 'KEEP_SEPARATE') {
        const [updated] = await tx.update(verificationRequests)
          .set({ possibleDuplicateOfId: null, updatedAt: new Date() })
          .where(and(eq(verificationRequests.id, candidate.id), eq(verificationRequests.possibleDuplicateOfId, parent.id)))
          .returning({ id: verificationRequests.id });
        if (!updated) return { status: 409 as const, error: 'This related-report decision is stale. Refresh the queue and try again.' };
        await tx.insert(auditLogs).values(createAuditEvent({
          actor: createAuditActor(user),
          action: PACC_AUDIT_ACTIONS.relatedSeparated,
          entityType: 'VERIFICATION_REQUEST',
          entityId: candidate.id,
          details: { requestId: candidate.requestId, formerParentRequestId: parent.id, formerParentPublicRequestId: parent.requestId },
        }));
        return { status: 200 as const, action: 'KEPT_SEPARATE' as const };
      }

      if (
        candidate.status !== 'PENDING'
        || candidate.nature !== 'NON-EMERGENCY'
        || candidate.type !== parent.type
        || candidate.nature !== parent.nature
        || parent.parentRequestId
        || (parent.status !== 'PENDING' && parent.status !== 'VERIFIED')
      ) {
        return { status: 409 as const, error: 'These requests can no longer be linked. Keep the report separate and review it again.' };
      }
      const [updated] = await tx.update(verificationRequests)
        .set({
          status: 'DUPLICATE',
          parentRequestId: parent.id,
          possibleDuplicateOfId: null,
          updatedAt: new Date(),
        })
        .where(and(eq(verificationRequests.id, candidate.id), eq(verificationRequests.possibleDuplicateOfId, parent.id), eq(verificationRequests.status, 'PENDING')))
        .returning({ id: verificationRequests.id });
      if (!updated) return { status: 409 as const, error: 'This related-report decision is stale. Refresh the queue and try again.' };
      await tx.insert(auditLogs).values(createAuditEvent({
        actor: createAuditActor(user),
        action: PACC_AUDIT_ACTIONS.relatedConfirmed,
        entityType: 'VERIFICATION_REQUEST',
        entityId: candidate.id,
        details: { requestId: candidate.requestId, parentRequestId: parent.id, parentPublicRequestId: parent.requestId },
      }));
      return { status: 200 as const, action: 'LINKED' as const };
    });

    if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, action: result.action });
  } catch (error) {
    console.error('Error deciding related report:', error);
    return NextResponse.json({ error: 'Unable to update the related report.' }, { status: 500 });
  }
}
