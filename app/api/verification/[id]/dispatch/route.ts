import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { systemSettings } from '@/db/schema/system_settings';
import { users } from '@/db/schema/users';
import { verificationRequests } from '@/db/schema/verification_requests';
import { notifyPaccAndCdrrmo } from '@/lib/dispatch-engine';
import {
  evaluateManualDispatchEligibility,
  RESPONDER_HEARTBEAT_FRESHNESS_MS,
} from '@/lib/dispatch-policy';
import { createClient } from '@/lib/supabase-server';

const ManualDispatchSchema = z.object({
  responderId: z.string().trim().min(1).max(255),
});

interface DispatchFailure {
  success: false;
  status: number;
  code: string;
  error: string;
}

function failure(status: number, code: string, error: string): DispatchFailure {
  return { success: false, status, code, error };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = ManualDispatchSchema.safeParse(await req.json());

    if (!payload.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_REQUEST', error: 'A valid responder is required.' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.app_metadata?.role !== 'pacc_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
    });
    const offerDuration = settings?.dispatchOfferTimeoutSeconds ?? 30;
    const responderId = payload.data.responderId;
    const now = new Date();
    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

    // The request row is the shared serialization point for automatic dispatch,
    // manual dispatch, and report state changes. Re-read every mutable decision
    // inside the transaction so a stale PACC screen cannot create a second offer.
    const result = await db.transaction(async (tx) => {
      const [verificationRequest] = await tx
        .select()
        .from(verificationRequests)
        .where(eq(verificationRequests.id, id))
        .limit(1)
        .for('update');

      if (!verificationRequest) {
        return failure(404, 'REPORT_NOT_FOUND', 'Request not found. Refresh the verification queue.');
      }

      const [existingIncident] = await tx
        .select()
        .from(incidents)
        .where(eq(incidents.requestId, id))
        .limit(1)
        .for('update');

      // Keep the lock order aligned with the offer accept/cascade paths:
      // request -> incident -> responder. This avoids cross-path deadlocks.
      const [responder] = await tx
        .select()
        .from(users)
        .where(eq(users.id, responderId))
        .limit(1)
        .for('update');

      if (!responder) {
        return failure(404, 'RESPONDER_NOT_FOUND', 'Responder not found. Refresh the responder list.');
      }

      const allowStaleHeartbeat = isDevMode && responder.email === 'responder@disastrace.com';
      const eligibility = evaluateManualDispatchEligibility({
        requestStatus: verificationRequest.status,
        incident: existingIncident ?? null,
        responder,
        now,
        allowStaleHeartbeat,
      });

      if (!eligibility.allowed) {
        return failure(409, eligibility.code, eligibility.message);
      }

      const responderConditions = [
        eq(users.id, responderId),
        eq(users.role, 'ambulance_responder'),
        eq(users.status, 'ACTIVE'),
        eq(users.verificationStatus, 'APPROVED'),
        eq(users.dutyStatus, 'ON_DUTY'),
      ];
      if (!allowStaleHeartbeat) {
        responderConditions.push(gte(
          users.lastLocationUpdatedAt,
          new Date(now.getTime() - RESPONDER_HEARTBEAT_FRESHNESS_MS),
        ));
      }

      const reserved = await tx
        .update(users)
        .set({ dutyStatus: 'ACTIVE_DISPATCH' })
        .where(and(...responderConditions))
        .returning({ id: users.id });

      if (reserved.length === 0) {
        return failure(409, 'RESPONDER_UNAVAILABLE', 'Selected responder is no longer available. Refresh the responder list.');
      }

      const initials = responder.fullName
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
      const vehicleId = `AMB-${initials || '001'}-${responder.id.slice(-3).toUpperCase()}`;
      const offerExpiresAt = new Date(now.getTime() + offerDuration * 1000);

      const [incident] = existingIncident
        ? await tx
          .update(incidents)
          .set({
            responderId: null,
            status: 'DISPATCHED',
            assignedAmbulance: vehicleId,
            etaMinutes: 8,
            currentOfferResponderId: responderId,
            offerExpiresAt,
            dispatchMethod: 'PACC_MANUAL',
            dispatchOfferDurationSeconds: offerDuration,
          })
          .where(eq(incidents.id, existingIncident.id))
          .returning()
        : await tx
          .insert(incidents)
          .values({
            id: crypto.randomUUID(),
            requestId: id,
            responderId: null,
            status: 'DISPATCHED',
            assignedAmbulance: vehicleId,
            etaMinutes: 8,
            currentOfferResponderId: responderId,
            skippedResponderIds: [],
            offerExpiresAt,
            dispatchMethod: 'PACC_MANUAL',
            dispatchOfferDurationSeconds: offerDuration,
          })
          .returning();

      if (!incident) {
        throw new Error('Manual dispatch transaction did not create an incident.');
      }

      await tx
        .update(verificationRequests)
        .set({ status: 'VERIFIED', updatedAt: now })
        .where(eq(verificationRequests.id, id));

      return {
        success: true as const,
        incident,
        responder,
        verificationRequest,
      };
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, code: result.code, error: result.error },
        { status: result.status },
      );
    }

    // The dispatch is already committed. A secondary admin-notification failure
    // must not make the UI claim that the responder offer failed.
    try {
      await notifyPaccAndCdrrmo({
        title: 'Manual Dispatch Offer Transmitted',
        body: `Manual dispatch offer sent to ${result.responder.fullName} for Request #${result.verificationRequest.requestId || id}. Awaiting responder acceptance.`,
        type: 'manual_dispatch_offered',
        metadata: {
          incidentId: result.incident.id,
          requestId: id,
          responderId: result.responder.id,
          responderName: result.responder.fullName,
        },
      });
    } catch (notificationError) {
      console.error('Manual dispatch committed but admin notification failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: `Manual dispatch offer sent to ${result.responder.fullName}. Awaiting responder acceptance.`,
      incident: result.incident,
    });
  } catch (error) {
    console.error('Error in POST /api/verification/[id]/dispatch:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', error: 'Unable to dispatch responder. Please refresh and try again.' },
      { status: 500 },
    );
  }
}
