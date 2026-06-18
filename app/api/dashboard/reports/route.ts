import { NextResponse } from 'next/server';
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

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

    // Fetch live active/recent incidents from database
    const activeIncidents = await db
      .select({
        id: incidents.id,
        requestId: verificationRequests.requestId,
        vehicleId: incidents.assignedAmbulance,
        destination: verificationRequests.locationDescription,
        createdAt: incidents.createdAt,
      })
      .from(incidents)
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .orderBy(desc(incidents.createdAt))
      .limit(10);

    const mapped = activeIncidents.map((i) => ({
      id: i.id,
      requestId: i.requestId,
      vehicleId: i.vehicleId || "AMB-001",
      origin: "CDRRMO HQ",
      destination: i.destination || "Baliwag City",
      timestamp: new Date(i.createdAt).toISOString(),
    }));

    return NextResponse.json({ data: mapped });
  } catch (error) {
    console.error("Error in GET /api/dashboard/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
