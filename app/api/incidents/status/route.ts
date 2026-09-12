import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { createClient } from '@/lib/supabase-server';

const IncidentIdSchema = z.object({
  incidentId: z.string().uuid(),
});

const StatusUpdateSchema = IncidentIdSchema.extend({
  status: z.enum(['ARRIVED', 'RESOLVED']),
  resolvedAt: z.string().datetime().optional(),
});

async function getActiveResponder() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const responder = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!responder || responder.role !== 'ambulance_responder' || responder.status !== 'ACTIVE') {
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

    const permittedCurrentStatuses = input.data.status === 'ARRIVED'
      ? ['EN_ROUTE', 'ARRIVED'] as const
      : ['EN_ROUTE', 'ARRIVED', 'RESOLVED'] as const;
    const [updated] = await db
      .update(incidents)
      .set({
        status: input.data.status,
        resolvedAt: input.data.status === 'RESOLVED'
          ? (input.data.resolvedAt ? new Date(input.data.resolvedAt) : new Date())
          : undefined,
      })
      .where(and(
        eq(incidents.id, input.data.incidentId),
        eq(incidents.responderId, auth.responder.id),
        inArray(incidents.status, permittedCurrentStatuses),
      ))
      .returning();

    if (!updated) {
      const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, input.data.incidentId) });
      if (!incident) return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
      if (incident.responderId !== auth.responder.id) return reassignedResponse();
      return NextResponse.json(
        { error: `This incident cannot transition from ${incident.status} to ${input.data.status}.` },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, incident: updated });
  } catch (error) {
    console.error('Error updating responder incident status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
