import { NextResponse } from 'next/server';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { verificationRequests } from '@/db/schema/verification_requests';
import { MapActiveRouteSchema } from '@/types/map';
import { z } from 'zod';

const ACTIVE_ROUTE_STATUSES = ['DISPATCHED', 'EN_ROUTE'] as const;

/**
 * Returns the authoritative responder-to-incident pairs currently travelling
 * to a scene. This is deliberately separate from the period-filtered marker
 * feed: an active route must remain visible even when its report began earlier.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const rows = await db
      .select({
        incidentId: incidents.id,
        responderId: users.id,
        responderLat: users.lastLatitude,
        responderLng: users.lastLongitude,
        responderLastUpdated: users.lastLocationUpdatedAt,
        incidentLat: verificationRequests.latitude,
        incidentLng: verificationRequests.longitude,
        severity: verificationRequests.severity,
      })
      .from(incidents)
      .innerJoin(users, eq(incidents.responderId, users.id))
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .where(and(
        inArray(incidents.status, ACTIVE_ROUTE_STATUSES),
        isNotNull(users.lastLatitude),
        isNotNull(users.lastLongitude),
        isNotNull(users.lastLocationUpdatedAt),
      ));

    const activeRoutes = rows.map((row) => ({
      incidentId: row.incidentId,
      responderId: row.responderId,
      responderLat: row.responderLat!,
      responderLng: row.responderLng!,
      responderLastUpdated: row.responderLastUpdated!.toISOString(),
      incidentLat: row.incidentLat,
      incidentLng: row.incidentLng,
      severity: row.severity,
    }));

    return NextResponse.json(z.array(MapActiveRouteSchema).parse(activeRoutes));
  } catch (error) {
    console.error('Error fetching active responder routes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
