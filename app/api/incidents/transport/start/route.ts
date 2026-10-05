import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { hospitals } from '@/db/schema/hospitals';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { createClient } from '@/lib/supabase-server';

const StartTransportSchema = z.object({
  incidentId: z.string().uuid(),
  hospitalId: z.string().min(1).max(50),
});

async function getActiveResponder() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const responder = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (
    !responder
    || responder.role !== 'ambulance_responder'
    || responder.status !== 'ACTIVE'
    || responder.verificationStatus !== 'APPROVED'
  ) {
    return {
      error: NextResponse.json({ error: 'Only active ambulance responders can start transport.' }, { status: 403 }),
    };
  }

  return { responder };
}

export async function POST(request: NextRequest) {
  try {
    const input = StartTransportSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json({ error: 'Invalid transport request.', details: input.error.format() }, { status: 400 });
    }

    const auth = await getActiveResponder();
    if ('error' in auth) return auth.error;

    const result = await db.transaction(async (tx) => {
      const [incident] = await tx.select()
        .from(incidents)
        .where(eq(incidents.id, input.data.incidentId))
        .for('update');
      if (!incident) return { kind: 'not_found' as const };
      if (incident.responderId !== auth.responder.id) return { kind: 'reassigned' as const };

      const [hospital] = await tx.select({
        id: hospitals.id,
        caters: hospitals.caters,
      })
        .from(hospitals)
        .where(eq(hospitals.id, input.data.hospitalId))
        .for('share');
      if (!hospital || hospital.caters !== true) return { kind: 'hospital_unavailable' as const };

      if (
        incident.status === 'ARRIVED'
        && incident.transportStatus === 'TO_HOSPITAL'
        && incident.transportHospitalId === input.data.hospitalId
      ) {
        return { kind: 'already_started' as const, incident };
      }
      if (incident.status !== 'ARRIVED') return { kind: 'not_ready' as const, status: incident.status };
      if (incident.transportStatus !== 'NONE') return { kind: 'already_started_elsewhere' as const };

      const [updated] = await tx.update(incidents)
        .set({
          transportStatus: 'TO_HOSPITAL',
          transportHospitalId: hospital.id,
          transportStartedAt: new Date(),
          transportArrivedAt: null,
        })
        .where(and(
          eq(incidents.id, incident.id),
          eq(incidents.responderId, auth.responder.id),
          eq(incidents.status, 'ARRIVED'),
          eq(incidents.transportStatus, 'NONE'),
        ))
        .returning();
      return updated
        ? { kind: 'started' as const, incident: updated }
        : { kind: 'state_changed' as const };
    });

    if (result.kind === 'not_found') return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
    if (result.kind === 'reassigned') {
      return NextResponse.json({ error: 'This response is no longer assigned to you.', code: 'INCIDENT_REASSIGNED' }, { status: 403 });
    }
    if (result.kind === 'hospital_unavailable') {
      return NextResponse.json({
        error: 'Hospital destination unavailable.',
        code: 'HOSPITAL_DESTINATION_UNAVAILABLE',
      }, { status: 422 });
    }
    if (result.kind === 'not_ready') {
      return NextResponse.json({
        error: `Transport cannot begin while the incident is ${result.status}.`,
        code: 'TRANSPORT_NOT_READY',
      }, { status: 409 });
    }
    if (result.kind === 'already_started_elsewhere') {
      return NextResponse.json({
        error: 'Hospital transport was already started with another destination.',
        code: 'TRANSPORT_ALREADY_STARTED',
      }, { status: 409 });
    }
    if (result.kind === 'state_changed') {
      return NextResponse.json({ error: 'The incident changed before transport could start.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      alreadyStarted: result.kind === 'already_started',
      incident: {
        id: result.incident.id,
        transportStatus: result.incident.transportStatus,
        transportHospitalId: result.incident.transportHospitalId,
        transportStartedAt: result.incident.transportStartedAt,
      },
    });
  } catch (error) {
    console.error('Error starting hospital transport:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
