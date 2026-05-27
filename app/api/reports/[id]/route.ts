import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { eq, or } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch report details dynamically joining DB tables
    const results = await db
      .select({
        id: reports.id,
        responderName: users.fullName,
        vehicleId: incidents.assignedAmbulance,
        type: verificationRequests.type,
        status: reports.status,
        createdAt: reports.createdAt,
        location: verificationRequests.locationDescription,
        residentReportDescription: verificationRequests.locationDescription,
        crewFindings: reports.description,
        natureOfCall: verificationRequests.nature,
        severityLevel: verificationRequests.severity,
        peopleInvolved: verificationRequests.peopleInvolved,
        scenePhotos: reports.scenePhotos,
        participants: reports.participants,
      })
      .from(reports)
      .innerJoin(incidents, eq(reports.incidentId, incidents.id))
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .innerJoin(users, eq(reports.responderId, users.id))
      .where(
        or(
          eq(reports.id, id),
          eq(reports.incidentId, id)
        )
      )
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const r = results[0];

    // Format output matching DetailedIncidentReport typescript contract
    const formatted = {
      id: r.id,
      responderName: r.responderName,
      vehicleId: r.vehicleId || "AMB-001",
      type: r.type,
      status: r.status === 'SUBMITTED' ? 'COMPLETED' : 'ONGOING',
      date: new Date(r.createdAt).toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: new Date(r.createdAt).toLocaleTimeString("en-US", {
        hour: '2-digit',
        minute: '2-digit'
      }),
      location: r.location || "Baliwag City",
      residentReportDescription: r.residentReportDescription || "Awaiting detail logs.",
      crewFindings: r.crewFindings || "No findings recorded.",
      natureOfCall: r.natureOfCall,
      severityLevel: r.severityLevel,
      peopleInvolved: r.peopleInvolved === 'None' ? 0 : r.peopleInvolved === '1-2 Persons' ? 2 : r.peopleInvolved === '3-5 Persons' ? 4 : 6,
      scenePhotos: Array.isArray(r.scenePhotos) ? r.scenePhotos : [],
      logs: [
        { action: "Incident Dispatched", time: new Date(r.createdAt).toLocaleTimeString() },
        { action: "Ambulance Arrived at Scene", time: new Date(r.createdAt).toLocaleTimeString() },
        { action: "Report Logs Submitted", time: new Date(r.createdAt).toLocaleTimeString() },
      ],
      participants: Array.isArray(r.participants) ? r.participants : [],
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error in GET /api/reports/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
