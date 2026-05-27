import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { createClient } from "@/lib/supabase-server";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for PACC Admin or CDRRMO Super Admin role
    const role = user?.app_metadata?.role;
    if (role !== "pacc_admin" && role !== "cdrrmo_super_admin") {
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

    const mappedRequests = requests.map((r) => {
      // Convert peopleInvolved enum string to a number
      let peopleCount = 0;
      if (r.peopleInvolved === '1-2 Persons') peopleCount = 2;
      else if (r.peopleInvolved === '3-5 Persons') peopleCount = 4;
      else if (r.peopleInvolved === '6+ Persons') peopleCount = 6;

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
          priorReports: 3, // Mock/Default standing score since not stored in DB
          isVerified: r.resident.verificationStatus === 'APPROVED',
        }
      };
    });

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
    const requestNature = nature || 'EMERGENCY';

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
