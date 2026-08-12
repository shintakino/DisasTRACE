import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId');
  const accessToken = request.nextUrl.searchParams.get('accessToken');
  if (!requestId || !accessToken) return NextResponse.json({ error: 'Missing report access credentials.' }, { status: 400 });

  const report = await db.query.verificationRequests.findFirst({
    where: and(eq(verificationRequests.id, requestId), eq(verificationRequests.guestAccessToken, accessToken)),
  });
  if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

  const incident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, report.id) });
  const responder = incident?.responderId
    ? await db.query.users.findFirst({
      where: eq(users.id, incident.responderId),
      columns: { id: true, fullName: true, lastLatitude: true, lastLongitude: true },
    })
    : null;
  const agencies = report.coordinationAgencies;
  const coordinationText = agencies.length > 0
    ? `Coordinating with ${agencies.length === 1 ? agencies[0] : `${agencies.slice(0, -1).join(', ')} and ${agencies.at(-1)}`}.`
    : null;
  const responseStatus = incident?.status === 'ARRIVED'
    ? 'Responders have arrived at your location.'
    : incident?.status === 'EN_ROUTE' || incident?.responderId
      ? `${coordinationText ? `${coordinationText} ` : ''}Responders are on the way. Please remain available for further instructions.`
      : report.triageClassification === 'HIGH_CONFIDENCE_NON_EMERGENCY'
        ? coordinationText || 'PACC is coordinating your non-emergency report.'
        : report.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY'
          ? coordinationText || 'PACC is securing the nearest available responder.'
          : 'PACC is reviewing your report.';
  return NextResponse.json({ data: { status: report.status, triageClassification: report.triageClassification, coordinationAgencies: agencies, responseStatus, incident, responder } });
}
