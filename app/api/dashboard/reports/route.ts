import { NextResponse } from 'next/server';
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { formatOfficialBaliwagLocation } from "@/lib/report-location";
import { compareOperationalIncidents } from "@/lib/incident-display-priority";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== 'cdrrmo_super_admin' && role !== 'pacc_admin') {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: `Access denied. Dashboard requires Admin privileges.`,
        currentRole: role 
      }, { status: 403 });
    }

    // Start with verification requests so reports awaiting triage remain visible
    // even before an incident/responder record exists.
    const activity = await db
      .select({
        requestInternalId: verificationRequests.id,
        incidentId: incidents.id,
        requestId: verificationRequests.requestId,
        vehicleId: incidents.assignedAmbulance,
        barangay: verificationRequests.barangay,
        type: verificationRequests.type,
        severity: verificationRequests.severity,
        nature: verificationRequests.nature,
        requestStatus: verificationRequests.status,
        incidentStatus: incidents.status,
        responderId: incidents.responderId,
        offerResponderId: incidents.currentOfferResponderId,
        createdAt: verificationRequests.createdAt,
      })
      .from(verificationRequests)
      .leftJoin(incidents, eq(incidents.requestId, verificationRequests.id))
      .orderBy(
        sql`case when ${verificationRequests.status} in ('REJECTED', 'DUPLICATE') or ${incidents.status} = 'RESOLVED' then 1 else 0 end asc`,
        sql`case ${verificationRequests.severity} when 'Critical' then 4 when 'High' then 3 when 'Medium' then 2 when 'Low' then 1 else 0 end desc`,
        sql`case when ${verificationRequests.status} = 'VERIFIED' and ${incidents.status} = 'DISPATCHED' and ${incidents.responderId} is null and ${incidents.currentOfferResponderId} is null then 1 else 0 end desc`,
        sql`${verificationRequests.createdAt} desc`,
      )
      .limit(100);

    const mapped = activity.map((i) => ({
      id: i.incidentId || i.requestInternalId,
      requestId: i.requestId,
      vehicleId: i.vehicleId || "Unassigned",
      destination: formatOfficialBaliwagLocation(i.barangay),
      timestamp: new Date(i.createdAt).toISOString(),
      type: i.type,
      severity: i.severity,
      nature: i.nature,
      requestStatus: i.requestStatus,
      incidentStatus: i.incidentStatus,
      requiresPaccReassignment: i.requestStatus === 'VERIFIED'
        && i.incidentStatus === 'DISPATCHED'
        && !i.responderId
        && !i.offerResponderId,
    })).sort((a, b) => compareOperationalIncidents(
      { id: a.id, severity: a.severity, status: a.incidentStatus ?? a.requestStatus, createdAt: a.timestamp, requiresPaccReassignment: a.requiresPaccReassignment },
      { id: b.id, severity: b.severity, status: b.incidentStatus ?? b.requestStatus, createdAt: b.timestamp, requiresPaccReassignment: b.requiresPaccReassignment },
    )).slice(0, 10);

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("Error in GET /api/dashboard/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
