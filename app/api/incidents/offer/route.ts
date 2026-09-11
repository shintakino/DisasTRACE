import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { incidents } from '@/db/schema/incidents';
import { verificationRequests } from '@/db/schema/verification_requests';
import { users } from '@/db/schema/users';
import { createClient } from '@/lib/supabase-server';
import { checkAndCascadeExpiredOffers } from '@/lib/dispatch-engine';

export const dynamic = 'force-dynamic';

/** Hydrates an offer after a responder taps an Expo notification. */
export async function GET(request: NextRequest) {
  const incidentId = request.nextUrl.searchParams.get('incidentId');
  if (!incidentId) return NextResponse.json({ error: 'Missing incident ID.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const responder = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { id: true, role: true },
  });
  if (responder?.role !== 'ambulance_responder') {
    return NextResponse.json({ error: 'Responder access is required.' }, { status: 403 });
  }

  const incident = await db.query.incidents.findFirst({ where: eq(incidents.id, incidentId) });
  if (!incident) return NextResponse.json({ error: 'Dispatch offer not found.' }, { status: 404 });

  // The expiry predicate is repeated in the database read. A stale push must
  // never resurrect an expired or reassigned offer on the mobile client.
  const [offer] = await db.select().from(incidents).where(and(
    eq(incidents.id, incidentId),
    eq(incidents.status, 'DISPATCHED'),
    eq(incidents.currentOfferResponderId, user.id),
    isNull(incidents.responderId),
    gt(incidents.offerExpiresAt, new Date()),
  )).limit(1);

  if (!offer) {
    await checkAndCascadeExpiredOffers();
    return NextResponse.json({ error: 'This dispatch offer has expired or was reassigned.' }, { status: 409 });
  }

  const report = await db.query.verificationRequests.findFirst({
    where: eq(verificationRequests.id, offer.requestId),
  });
  if (!report) return NextResponse.json({ error: 'The report for this offer is unavailable.' }, { status: 404 });

  const reporter = report.residentId
    ? await db.query.users.findFirst({
      where: eq(users.id, report.residentId),
      columns: { fullName: true, phone: true },
    })
    : null;

  return NextResponse.json({
    data: {
      id: offer.id,
      type: report.type,
      natureOfCall: report.nature,
      locationName: report.barangay ? `${report.barangay}, Baliwag City` : 'Location unavailable',
      latitude: report.latitude,
      longitude: report.longitude,
      peopleInvolved: Number.parseInt(report.peopleInvolved.match(/\d+/)?.[0] || '1', 10),
      etaMinutes: offer.etaMinutes,
      createdAt: offer.createdAt,
      dispatchOfferDurationSeconds: offer.dispatchOfferDurationSeconds,
      offerExpiresAt: offer.offerExpiresAt,
      assignedAmbulance: offer.assignedAmbulance,
      attachmentUrl: report.imageUrl,
      reporterName: reporter?.fullName || 'Guest Reporter',
      reporterPhone: report.contactNumber || reporter?.phone || null,
    },
  });
}
