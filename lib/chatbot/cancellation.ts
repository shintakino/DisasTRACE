import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { verificationRequests } from '@/db/schema/verification_requests';
import { canCancelChatbotReport } from '@/lib/chatbot/lifecycle';

export type CancellationProof =
  | { kind: 'registered'; residentId: string }
  | { kind: 'guest'; accessToken: string };

export type CancellationResult =
  | { ok: true; request: typeof verificationRequests.$inferSelect }
  | { ok: false; status: 404 | 409; error: string };

export async function cancelChatbotReport(requestId: string, proof: CancellationProof): Promise<CancellationResult> {
  return db.transaction(async (transaction) => {
    const proofCondition = proof.kind === 'registered'
      ? eq(verificationRequests.residentId, proof.residentId)
      : and(eq(verificationRequests.reporterType, 'GUEST'), eq(verificationRequests.guestAccessToken, proof.accessToken));
    const [report] = await transaction
      .select()
      .from(verificationRequests)
      .where(and(eq(verificationRequests.id, requestId), proofCondition))
      .limit(1)
      .for('update');
    if (!report) return { ok: false, status: 404, error: 'Report not found or cannot be cancelled.' };
    const [activeIncident] = await transaction
      .select({ id: incidents.id })
      .from(incidents)
      .where(eq(incidents.requestId, report.id))
      .limit(1);
    if (!canCancelChatbotReport({ status: report.status, hasIncident: Boolean(activeIncident) })) {
      return { ok: false, status: 409, error: activeIncident ? 'This report has an active response. Contact PACC for assistance.' : 'This report is no longer pending. Contact PACC for assistance.' };
    }

    const cancellationReason = 'Cancelled by the reporter through the DisasTRACE chatbot.';
    const [updated] = await transaction
      .update(verificationRequests)
      .set({ status: 'REJECTED', triageReasons: [...report.triageReasons, cancellationReason], updatedAt: new Date() })
      .where(and(eq(verificationRequests.id, report.id), eq(verificationRequests.status, 'PENDING')))
      .returning();
    return updated
      ? { ok: true, request: updated }
      : { ok: false, status: 409, error: 'The report changed before cancellation. Contact PACC for assistance.' };
  });
}
