import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { createClient } from "@/lib/supabase-server";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for PACC Admin role (mocking check by requiring user for now)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch from database
    const requests = await db.query.verificationRequests.findMany({
      orderBy: [desc(verificationRequests.createdAt)],
      limit: 50,
      with: {
        resident: true, // Assuming relation exists in schema
      }
    });

    return NextResponse.json(requests);
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
    } = body;

    if (!incidentType || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate Request ID
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const requestIdStr = `REQ-${year}-${randomNum}`;

    // Insert into database
    const [newRequest] = await db.insert(verificationRequests).values({
      id: crypto.randomUUID(),
      requestId: requestIdStr,
      residentId: user.id,
      status: 'PENDING',
      nature: 'EMERGENCY',
      type: incidentType,
      locationDescription: landmarks || null,
      latitude,
      longitude,
      imageUrl: imageUrl || null,
    }).returning();

    return NextResponse.json({ 
      success: true, 
      request: newRequest 
    });
  } catch (error) {
    console.error('Error in POST /api/verification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
