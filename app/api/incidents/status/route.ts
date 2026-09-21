import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { createClient } from '@/lib/supabase-server';
import { retryPendingAutomaticDispatches } from '@/lib/dispatch-engine';

const IncidentIdSchema = z.object({
  incidentId: z.string().uuid(),
});

const StatusUpdateSchema = IncidentIdSchema.extend({
  status: z.enum(['ARRIVED', 'DOCUMENTATION_PENDING']),
  fieldOutcome: z.enum(['HANDLED_ON_SCENE', 'PATIENT_REFUSED', 'HOSPITAL_ARRIVAL']).optional(),
}).superRefine((value, context) => {
  if (value.status === 'DOCUMENTATION_PENDING' && !value.fieldOutcome) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fieldOutcome'],
      message: 'A confirmed field outcome is required before documentation can be deferred.',
    });
  }
});

async function getActiveResponder() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const responder = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (
    !responder
    || responder.role !== 'ambulance_responder'
    || responder.status !== 'ACTIVE'
    || responder.verificationStatus !== 'APPROVED'
  ) {
    return {
      error: NextResponse.json(
        { error: 'Only active ambulance responders can update an incident.' },
        { status: 403 },
      ),
    };
  }

  return { responder };
}

function reassignedResponse() {
  return NextResponse.json(
    {
      error: 'This response is no longer assigned to you. It may have been reassigned to another responder.',
      code: 'INCIDENT_REASSIGNED',
    },
    { status: 403 },
  );
}

/** Returns the server-authoritative ownership state before opening a responder report form. */
export async function GET(request: NextRequest) {
  try {
    const input = IncidentIdSchema.safeParse({ incidentId: request.nextUrl.searchParams.get('incidentId') });
    if (!input.success) {
      return NextResponse.json({ error: 'Invalid incident ID.', details: input.error.format() }, { status: 400 });
    }

    const auth = await getActiveResponder();
    if ('error' in auth) return auth.error;

    const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, input.data.incidentId) });
    if (!incident) return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
    if (incident.responderId !== auth.responder.id) return reassignedResponse();

    return NextResponse.json({
      success: true,
      incident: {
        id: incident.id,
        status: incident.status,
        responderId: incident.responderId,
      },
    });
  } catch (error) {
    console.error('Error verifying responder incident ownership:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** Advances an assigned responder's incident without permitting stale offers to mutate it. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = StatusUpdateSchema.safeParse(body);
    if (!input.success) {
      return NextResponse.json({ error: 'Invalid payload.', details: input.error.format() }, { status: 400 });
    }

    const auth = await getActiveResponder();
    if ('error' in auth) return auth.error;

    if (input.data.status === 'ARRIVED') {
      const [updated] = await db
        .update(incidents)
        .set({ status: 'ARRIVED' })
        .where(and(
          eq(incidents.id, input.data.incidentId),
          eq(incidents.responderId, auth.responder.id),
          inArray(incidents.status, ['EN_ROUTE', 'ARRIVED']),
        ))
        .returning();

      if (!updated) {
        const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, input.data.incidentId) });
        if (!incident) return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
        if (incident.responderId !== auth.responder.id) return reassignedResponse();
        return NextResponse.json(
          { error: `This incident cannot transition from ${incident.status} to ARRIVED.` },
          { status: 409 },
        );
      }

      return NextResponse.json({ success: true, incident: updated });
    }

    const deferred = await db.transaction(async (tx) => {
      const [lockedIncident] = await tx.select()
        .from(incidents)
        .where(eq(incidents.id, input.data.incidentId))
        .for('update');
      if (!lockedIncident || lockedIncident.responderId !== auth.responder.id) {
        return { kind: 'reassigned' as const };
      }
      const fieldOutcome = input.data.fieldOutcome!;
      // A connection may fail after this transaction commits but before the
      // responder receives its response. Replaying the same confirmed outcome
      // must acknowledge the original release rather than trap the responder
      // behind a false transition conflict.
      if (
        lockedIncident.status === 'DOCUMENTATION_PENDING'
        && lockedIncident.fieldOutcome === fieldOutcome
      ) {
        return { kind: 'already_deferred' as const, incident: lockedIncident };
      }
      if (lockedIncident.status !== 'ARRIVED') {
        return { kind: 'not_ready' as const, status: lockedIncident.status };
      }

      if (fieldOutcome === 'HOSPITAL_ARRIVAL' && lockedIncident.transportStatus !== 'ARRIVED_AT_HOSPITAL') {
        return { kind: 'invalid_outcome' as const, message: 'Hospital arrival must be confirmed before documentation can be deferred.' };
      }
      if (fieldOutcome !== 'HOSPITAL_ARRIVAL' && lockedIncident.transportStatus !== 'NONE') {
        return { kind: 'invalid_outcome' as const, message: 'A transport incident can be released only after hospital arrival is confirmed.' };
      }

      const [updated] = await tx.update(incidents)
        .set({
          status: 'DOCUMENTATION_PENDING',
          fieldOutcome,
          fieldResponseCompletedAt: new Date(),
        })
        .where(and(
          eq(incidents.id, lockedIncident.id),
          eq(incidents.responderId, auth.responder.id),
          eq(incidents.status, 'ARRIVED'),
        ))
        .returning();
      if (!updated) return { kind: 'not_ready' as const, status: lockedIncident.status };

      const otherFieldResponse = await tx.query.incidents.findFirst({
        where: and(
          eq(incidents.responderId, auth.responder.id),
          inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']),
        ),
        columns: { id: true },
      });
      if (!otherFieldResponse) {
        await tx.update(users)
          .set({ dutyStatus: 'ON_DUTY' })
          .where(and(eq(users.id, auth.responder.id), eq(users.dutyStatus, 'ACTIVE_DISPATCH')));
      }

      return { kind: 'deferred' as const, incident: updated };
    });

    if (deferred.kind === 'reassigned') return reassignedResponse();
    if (deferred.kind === 'not_ready') {
      const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, input.data.incidentId) });
      if (!incident) return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
      if (incident.responderId !== auth.responder.id) return reassignedResponse();
      return NextResponse.json(
        { error: `This incident cannot transition from ${incident.status} to DOCUMENTATION_PENDING.` },
        { status: 409 },
      );
    }
    if (deferred.kind === 'invalid_outcome') {
      return NextResponse.json({ error: deferred.message }, { status: 409 });
    }

    // Releasing a completed field response should make the responder eligible
    // immediately, but a dispatch retry must never make this committed action
    // appear to have failed. It is also safe after an idempotent replay: the
    // first request may have committed before the client lost its response.
    void retryPendingAutomaticDispatches().catch((error) => {
      console.error('Responder became available, but pending-dispatch retry failed:', error);
    });

    return NextResponse.json({
      success: true,
      incident: deferred.incident,
      message: deferred.kind === 'already_deferred'
        ? 'Field response was already confirmed. Documentation remains pending and you are available for another dispatch.'
        : 'Field response completed. Documentation remains pending and you are available for another dispatch.',
    });
  } catch (error) {
    console.error('Error updating responder incident status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
