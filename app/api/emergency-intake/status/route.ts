import { NextRequest, NextResponse } from 'next/server';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { incidents } from '@/db/schema/incidents';
import { users } from '@/db/schema/users';
import { hospitals } from '@/db/schema/hospitals';
import { createClient } from '@/lib/supabase-server';
import { cascadeIncident } from '@/lib/dispatch-engine';
import { requiresPaccReassignment } from '@/lib/dispatch-policy';
import { projectReporterReportStatus } from '@/lib/rejected-report-workflow';
import { systemSettings } from '@/db/schema/system_settings';
import { guestDeviceReportQuotas } from '@/db/schema/guest_device_report_quotas';
import { DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT } from '@/lib/guest-report-limit';
import { philippineMobileNumberVariants } from '@/lib/phone-number';

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get('requestId');
  const accessToken = request.headers.get('x-guest-report-token') ?? request.nextUrl.searchParams.get('accessToken');
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
  const rejectionProjection = projectReporterReportStatus({
    requestStatus: report.status,
    rejectionReason: report.rejectionReason,
  });
  const outcome = report.status === 'REJECTED'
    ? 'REJECTED'
    : incident?.status === 'RESOLVED' ? 'CASE_CLOSED' : 'ACTIVE';
  const responseStatus = report.status === 'REJECTED'
    ? rejectionProjection.responseStatus
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
  let guestAllowance: { limit: number; used: number; remaining: number } | undefined;
  if (report.reporterType === 'GUEST' && report.contactNumber && report.guestDeviceHash) {
    const [settings, [{ phoneUsed }], deviceQuota] = await Promise.all([
      db.query.systemSettings.findFirst({
        where: eq(systemSettings.id, 'current'),
        columns: { guestReportsPerPhoneLimit: true },
      }),
      db.select({ phoneUsed: count() }).from(verificationRequests).where(and(
        eq(verificationRequests.reporterType, 'GUEST'),
        inArray(verificationRequests.contactNumber, philippineMobileNumberVariants(report.contactNumber)),
      )),
      db.query.guestDeviceReportQuotas.findFirst({
        where: eq(guestDeviceReportQuotas.deviceHash, report.guestDeviceHash),
        columns: { reportCount: true },
      }),
    ]);
    const limit = settings?.guestReportsPerPhoneLimit ?? DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT;
    const used = Math.max(Number(phoneUsed), deviceQuota?.reportCount ?? 0);
    guestAllowance = { limit, used, remaining: Math.max(0, limit - used) };
  }
  return NextResponse.json({
    data: {
      status: report.status,
      outcome,
      rejectionReason: report.status === 'REJECTED' ? rejectionProjection.rejectionReason : null,
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
      guestAllowance,
    },
    error: null,
    message: null,
  });
}
