import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { verificationRequests } from '@/db/schema/verification_requests';
import { eq } from 'drizzle-orm';
import { canPaccRejectVerificationRequest, normalizeRequiredRejectionReason } from '@/lib/rejected-report-workflow';
import { auditLogs } from '@/db/schema/audit_logs';
import { createAuditEvent, PACC_AUDIT_ACTIONS, type AuditActor } from '@/lib/audit-events';

interface RejectionFailure {
  success: false;
  status: 400 | 404 | 409;
  error: string;
}

interface RejectionSuccess {
  success: true;
  request: typeof verificationRequests.$inferSelect;
}

export type RejectVerificationRequestResult = RejectionFailure | RejectionSuccess;

export async function rejectVerificationRequest(
  id: string,
  rawRejectionReason: unknown,
  actor?: AuditActor,
): Promise<RejectVerificationRequestResult> {
  const rejectionReason = normalizeRequiredRejectionReason(rawRejectionReason);
  if (!rejectionReason) {
    return {
      success: false,
      status: 400,
      error: 'A clear rejection reason is required.',
    };
  }

  return db.transaction(async (tx) => {
    const [lockedRequest] = await tx
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, id))
      .limit(1)
      .for('update');

    if (!lockedRequest) {
      return { success: false, status: 404, error: 'Request not found' } as const;
    }

    const [lockedIncident] = await tx
      .select()
      .from(incidents)
      .where(eq(incidents.requestId, id))
      .limit(1)
      .for('update');

    const canReject = canPaccRejectVerificationRequest({
      requestStatus: lockedRequest.status,
      incident: lockedIncident ? {
        incidentStatus: lockedIncident.status,
        responderId: lockedIncident.responderId,
        currentOfferResponderId: lockedIncident.currentOfferResponderId,
      } : null,
    });

    if (!canReject) {
      return {
        success: false,
        status: 409,
        error: 'Only pending reports without an active response can be rejected.',
      } as const;
    }

    if (lockedIncident) {
      await tx.delete(incidents).where(eq(incidents.id, lockedIncident.id));
    }

    const [updatedRequest] = await tx
      .update(verificationRequests)
      .set({
        status: 'REJECTED',
        rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(verificationRequests.id, id))
      .returning();

    if (actor) {
      await tx.insert(auditLogs).values(createAuditEvent({
        actor,
        action: PACC_AUDIT_ACTIONS.rejected,
        entityType: 'VERIFICATION_REQUEST',
        entityId: id,
        details: { requestId: lockedRequest.requestId, rejectionReason, previousStatus: lockedRequest.status, newStatus: 'REJECTED' },
      }));
    }

    return { success: true, request: updatedRequest } as const;
  });
}
