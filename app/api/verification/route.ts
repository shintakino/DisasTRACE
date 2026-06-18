import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { incidents } from "@/db/schema/incidents";
import { createClient } from "@/lib/supabase-server";
import { eq, desc, sql } from "drizzle-orm";
import { checkAndCascadeExpiredOffers, checkAndRecycleManualOverrides } from "@/lib/dispatch-engine";

export async function GET(req: NextRequest) {
  try {
    // 1. Run self-healing checks on active dispatch offers and manual overrides
    await checkAndCascadeExpiredOffers();
    await checkAndRecycleManualOverrides();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for PACC Admin role
    const role = user?.app_metadata?.role;
    if (role !== "pacc_admin") {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from database
    const requests = await db.query.verificationRequests.findMany({
      orderBy: [desc(verificationRequests.createdAt)],
      limit: 50,
      with: {
        resident: true,
      }
    });

    const mappedRequests = await Promise.all(requests.map(async (r) => {
      // Query associated incident
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.requestId, r.id),
      });

      // Count actual prior reports in the database
      const priorCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(verificationRequests)
        .where(
          sql`${verificationRequests.residentId} = ${r.resident.id} AND ${verificationRequests.id} != ${r.id}`
        );
      const priorReportsCount = priorCount[0]?.count ? Number(priorCount[0].count) : 0;

      // Count actual rejected reports in the database
      const rejectedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(verificationRequests)
        .where(
          sql`${verificationRequests.residentId} = ${r.resident.id} AND ${verificationRequests.id} != ${r.id} AND ${verificationRequests.status} = 'REJECTED'`
        );
      const rejectedReportsCount = rejectedCount[0]?.count ? Number(rejectedCount[0].count) : 0;

      // Calculate Reliability Score: starts at 100, subtracts 33 per rejected report, min 0
      const reliabilityScore = Math.max(0, 100 - (rejectedReportsCount * 33));

      // Convert peopleInvolved enum string or text count to a number robustly
      let peopleCount = 0;
      if (r.peopleInvolved === '1-2 Persons') {
        peopleCount = 2;
      } else if (r.peopleInvolved === '3-5 Persons') {
        peopleCount = 4;
      } else if (r.peopleInvolved === '6+ Persons') {
        peopleCount = 6;
      } else {
        const matched = r.peopleInvolved.match(/\d+/);
        if (matched) {
          peopleCount = parseInt(matched[0], 10);
        }
      }

      const imageUrlStr = r.imageUrl || undefined;

      return {
        id: r.id,
        requestId: r.requestId,
        status: r.status,
        nature: r.nature,
        type: r.type,
        location: r.locationDescription || "Baliwag City",
        peopleInvolved: peopleCount,
        imageUrl: imageUrlStr,
        receivedAt: r.createdAt.toISOString(),
        resident: {
          id: r.resident.id,
          fullName: r.resident.fullName,
          phone: r.resident.phone || "No phone provided",
          address: r.resident.address || "No address recorded",
          priorReports: priorReportsCount,
          isVerified: r.resident.verificationStatus === 'APPROVED',
          reliabilityScore,
        },
        incident: incident ? {
          id: incident.id,
          status: incident.status,
          responderId: incident.responderId,
          currentOfferResponderId: incident.currentOfferResponderId,
          dispatchMethod: incident.dispatchMethod
        } : null
      };
    }));

    return NextResponse.json(mappedRequests);
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      incidentType,
      peopleInvolved,
      landmarks,
      latitude,
      longitude,
      imageUrl,
      severity,
      nature,
    } = body;

    if (!incidentType || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate Request ID
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const requestIdStr = `REQ-${year}-${randomNum}`;

    // Determine initial status based on request nature (we will try to auto-dispatch first if critical)
    const severityLevel = severity || 'Medium';
    const requestNature = (nature || 'EMERGENCY').toUpperCase() as 'EMERGENCY' | 'NON-EMERGENCY';

    // Insert into database
    const [newRequest] = await db.insert(verificationRequests).values({
      id: crypto.randomUUID(),
      requestId: requestIdStr,
      residentId: user.id,
      status: 'PENDING',
      nature: requestNature,
      type: incidentType,
      peopleInvolved: peopleInvolved || 'None',
      severity: severityLevel,
      locationDescription: landmarks || null,
      latitude,
      longitude,
      imageUrl: imageUrl || null,
    }).returning();

    // Auto Dispatch Logic
    if (severityLevel === 'Critical' || severityLevel === 'Emergency' || requestNature === 'EMERGENCY') {
      const { autoDispatchIncident } = await import('@/lib/dispatch-engine');
      const incident = await autoDispatchIncident(newRequest.id, user.id, latitude, longitude);
      
      if (incident) {
        return NextResponse.json({ 
          success: true, 
          request: { ...newRequest, status: 'VERIFIED' },
          incident,
          autoDispatched: true
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      request: newRequest,
      autoDispatched: false
    });
  } catch (error) {
    console.error('Error in POST /api/verification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
