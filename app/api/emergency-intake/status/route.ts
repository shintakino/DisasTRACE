import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { hospitals } from '@/db/schema/hospitals';
import { createClient } from '@/lib/supabase-server';
import { cascadeIncident } from '@/lib/dispatch-engine';
import { requiresPaccReassignment } from '@/lib/dispatch-policy';

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
  let incident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, trackingRequestId) });

  // The scheduler is the normal expiry mechanism, but a reporter's status
  // refresh is a safe, scoped fallback. It heals only this report's expired
  // current offer rather than scanning every dispatch on each mobile poll.
  if (
    incident?.status === 'DISPATCHED'
    && incident.currentOfferResponderId
    && !incident.responderId
    && incident.offerExpiresAt
    && incident.offerExpiresAt.getTime() <= Date.now()
  ) {
    await cascadeIncident(incident.id, incident.currentOfferResponderId);
    incident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, trackingRequestId) });
  }

  const needsPaccReassignment = requiresPaccReassignment(incident);
  const responder = incident?.responderId
    ? await db.query.users.findFirst({
      where: eq(users.id, incident.responderId),
      columns: { id: true, fullName: true, lastLatitude: true, lastLongitude: true },
    })
    : null;
  const transportHospital = incident?.transportHospitalId
    ? await db.query.hospitals.findFirst({
      where: eq(hospitals.id, incident.transportHospitalId),
      columns: { id: true, name: true, lat: true, lng: true },
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
      : needsPaccReassignment
        ? `${coordinationText ? `${coordinationText} ` : ''}PACC is arranging another available responder. Please remain available for updates.`
      : incident?.status === 'RESOLVED'
        ? 'Response coordination for this incident has been completed.'
        : incident?.transportStatus === 'TO_HOSPITAL'
          ? `${coordinationText ? `${coordinationText} ` : ''}Responder is transporting the patient to the selected hospital.`
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
      transport: {
        status: incident?.transportStatus ?? 'NONE',
        hospital: transportHospital
          ? {
            id: transportHospital.id,
            name: transportHospital.name,
            coordinates: { latitude: transportHospital.lat, longitude: transportHospital.lng },
          }
          : null,
      },
      trackingRequestId,
      isMergedDuplicate: trackingRequestId !== report.id,
      requiresPaccReassignment: needsPaccReassignment,
    },
    error: null,
    message: null,
  });
}
