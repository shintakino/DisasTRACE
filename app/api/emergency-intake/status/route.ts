import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId');
  const accessToken = request.nextUrl.searchParams.get('accessToken');
  if (!requestId) return NextResponse.json({ data: null, error: 'Missing report ID.', message: 'Missing report ID.' }, { status: 400 });

  let report: typeof verificationRequests.$inferSelect | undefined;
  if (accessToken) {
    report = await db.query.verificationRequests.findFirst({
      where: and(eq(verificationRequests.id, requestId), eq(verificationRequests.guestAccessToken, accessToken), eq(verificationRequests.reporterType, 'GUEST')),
    });
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    report = await db.query.verificationRequests.findFirst({
      where: and(eq(verificationRequests.id, requestId), eq(verificationRequests.residentId, user.id), eq(verificationRequests.reporterType, 'REGISTERED')),
    });
  }
  if (!report) return NextResponse.json({ data: null, error: 'Report not found.', message: 'Report not found.' }, { status: 404 });

  const trackingRequestId = report.status === 'DUPLICATE' && report.parentRequestId ? report.parentRequestId : report.id;
  const incident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, trackingRequestId) });
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
  const responseStatus = report.status === 'REJECTED'
    ? 'PACC has closed this report. Contact PACC if you still need assistance.'
    : report.status === 'DUPLICATE' && !incident
      ? 'PACC linked this report to another report of the same event and is reviewing the primary response.'
      : incident?.status === 'RESOLVED'
        ? 'Response coordination for this incident has been completed.'
        : incident?.status === 'ARRIVED'
          ? 'Responders have arrived at your location.'
          : incident?.status === 'EN_ROUTE' || incident?.responderId
      ? `${coordinationText ? `${coordinationText} ` : ''}Responders are on the way. Please remain available for further instructions.`
      : report.triageClassification === 'HIGH_CONFIDENCE_NON_EMERGENCY'
        ? coordinationText || 'PACC is coordinating your non-emergency report.'
        : report.triageClassification === 'HIGH_CONFIDENCE_EMERGENCY'
          ? coordinationText || 'PACC is securing the nearest available responder.'
          : 'PACC is reviewing your report.';
  return NextResponse.json({
    data: {
      status: report.status,
      triageClassification: report.triageClassification,
      coordinationAgencies: agencies,
      responseStatus,
      incident,
      responder,
      trackingRequestId,
      isMergedDuplicate: trackingRequestId !== report.id,
    },
    error: null,
    message: null,
  });
}
