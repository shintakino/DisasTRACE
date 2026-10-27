import { NextResponse } from 'next/server';
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { incidents, users, verificationRequests } from '@/db/schema';
import { createClient } from '@/lib/supabase-server';

/** One consistent, owner-scoped snapshot for foreground and reconnect recovery. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    const data = await db.transaction(async tx => {
      const responder = await tx.query.users.findFirst({ where: eq(users.id, user.id) });
      if (!responder || responder.role !== 'ambulance_responder'
        || responder.status !== 'ACTIVE' || responder.verificationStatus !== 'APPROVED') return null;
      const assigned = await tx.query.incidents.findFirst({
        where: and(eq(incidents.responderId, user.id), inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED'])),
        orderBy: [desc(incidents.createdAt)],
      });
      const incident = assigned ?? await tx.query.incidents.findFirst({
        where: and(eq(incidents.currentOfferResponderId, user.id), eq(incidents.status, 'DISPATCHED'),
          isNull(incidents.responderId), gt(incidents.offerExpiresAt, new Date())),
        orderBy: [desc(incidents.createdAt)],
      });
      if (!incident) return { dutyStatus: responder.dutyStatus, dispatch: null };
      const report = await tx.query.verificationRequests.findFirst({ where: eq(verificationRequests.id, incident.requestId) });
      // Missing evidence is a recovery error, never an instruction to clear a valid response.
      if (!report) throw new Error('Assigned incident report is unavailable.');
      const reporter = report.residentId ? await tx.query.users.findFirst({
        where: eq(users.id, report.residentId), columns: { fullName: true, phone: true },
      }) : null;
      return {
        dutyStatus: 'ACTIVE_DISPATCH' as const,
        dispatch: {
          id: incident.id, isOffer: !assigned, status: incident.status,
          transportStatus: incident.transportStatus, transportHospitalId: incident.transportHospitalId,
          type: report.type, natureOfCall: report.nature,
          locationName: report.barangay ? `${report.barangay}, Baliwag City` : 'Location unavailable',
          latitude: report.latitude, longitude: report.longitude,
          peopleInvolved: Number.parseInt(report.peopleInvolved.match(/\d+/)?.[0] || '1', 10),
          etaMinutes: incident.etaMinutes, createdAt: incident.createdAt,
          dispatchOfferDurationSeconds: incident.dispatchOfferDurationSeconds, offerExpiresAt: incident.offerExpiresAt,
          assignedAmbulance: incident.assignedAmbulance, attachmentUrl: report.imageUrl,
          reporterName: reporter?.fullName || 'Guest Reporter', reporterPhone: report.contactNumber || reporter?.phone || null,
        },
      };
    }, { isolationLevel: 'repeatable read', accessMode: 'read only' });
    if (!data) return NextResponse.json({ error: 'Active approved responder access is required.' }, { status: 403 });
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Responder recovery failed:', error);
    return NextResponse.json({ error: 'Unable to refresh your response. Your last confirmed state is retained.' }, { status: 503 });
  }
}
