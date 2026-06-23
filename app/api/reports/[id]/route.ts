import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { patientCareReports, driverTripTickets } from "@/db/schema/patient_care";
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
        incidentId: reports.incidentId,
        responderName: users.fullName,
        vehicleId: incidents.assignedAmbulance,
        type: verificationRequests.type,
        status: reports.status,
        createdAt: reports.createdAt,
        location: verificationRequests.locationDescription,
        residentReportDescription: verificationRequests.locationDescription,
        residentPhotoUrl: verificationRequests.imageUrl,
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
      // 2. If not found, check verification_requests (user report)
      const userReq = await db.query.verificationRequests.findFirst({
        where: or(
          eq(verificationRequests.id, id),
          eq(verificationRequests.requestId, id)
        ),
        with: {
          resident: true,
        }
      });

      if (!userReq) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      // Check if there is an associated incident and responder
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.requestId, userReq.id),
      });

      let responderName = "None Assigned";
      let vehicleId = "N/A";
      if (incident && incident.responderId) {
        const responder = await db.query.users.findFirst({
          where: eq(users.id, incident.responderId),
        });
        if (responder) {
          responderName = responder.fullName;
          vehicleId = incident.assignedAmbulance || "AMB-001";
        }
      }

      const formatted = {
        id: userReq.requestId || userReq.id,
        incidentId: incident?.id || userReq.id,
        responderName: responderName,
        vehicleId: vehicleId,
        type: userReq.type,
        status: userReq.status, // PENDING, VERIFIED, REJECTED, DUPLICATE
        date: new Date(userReq.createdAt).toLocaleDateString("en-US", {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: new Date(userReq.createdAt).toLocaleTimeString("en-US", {
          hour: '2-digit',
          minute: '2-digit'
        }),
        location: userReq.locationDescription || "Baliwag City",
        residentReportDescription: userReq.locationDescription || "Awaiting detail logs.",
        residentPhotoUrl: userReq.imageUrl,
        crewFindings: "No responder findings available yet (User Submitted Report).",
        natureOfCall: userReq.nature,
        severityLevel: userReq.severity,
        peopleInvolved: (() => {
          if (!userReq.peopleInvolved || userReq.peopleInvolved === 'None') return 0;
          const match = userReq.peopleInvolved.match(/\d+/);
          return match ? parseInt(match[0], 10) : 1;
        })(),
        scenePhotos: [],
        logs: [
          { action: "Incident Reported by Resident", time: new Date(userReq.createdAt).toLocaleTimeString() },
          ...(userReq.status === "VERIFIED" ? [{ action: "Incident Verified by Dispatcher", time: new Date(userReq.updatedAt).toLocaleTimeString() }] : []),
          ...(userReq.status === "REJECTED" ? [{ action: "Incident Rejected by Dispatcher", time: new Date(userReq.updatedAt).toLocaleTimeString() }] : []),
          ...(userReq.status === "DUPLICATE" ? [{ action: "Incident Merged as Duplicate", time: new Date(userReq.updatedAt).toLocaleTimeString() }] : []),
        ],
        participants: [],
      };

      return NextResponse.json(formatted);
    }

    const r = results[0];

    // Fetch associated Patient Care Reports and Driver Trip Ticket
    const patientCare = await db
      .select()
      .from(patientCareReports)
      .where(eq(patientCareReports.incidentId, r.incidentId));

    const tripTicket = await db
      .select()
      .from(driverTripTickets)
      .where(eq(driverTripTickets.incidentId, r.incidentId))
      .limit(1);

    // Format output matching DetailedIncidentReport typescript contract
    const formatted = {
      id: r.id,
      incidentId: r.incidentId,
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
      residentPhotoUrl: r.residentPhotoUrl,
      crewFindings: r.crewFindings || "No findings recorded.",
      natureOfCall: r.natureOfCall,
      severityLevel: r.severityLevel,
      peopleInvolved: (() => {
        if (!r.peopleInvolved || r.peopleInvolved === 'None') return 0;
        const match = r.peopleInvolved.match(/\d+/);
        return match ? parseInt(match[0], 10) : 1;
      })(),
      scenePhotos: Array.isArray(r.scenePhotos) ? r.scenePhotos : [],
      logs: [
        { action: "Incident Dispatched", time: new Date(r.createdAt).toLocaleTimeString() },
        { action: "Ambulance Arrived at Scene", time: new Date(r.createdAt).toLocaleTimeString() },
        { action: "Report Logs Submitted", time: new Date(r.createdAt).toLocaleTimeString() },
      ],
      participants: Array.isArray(r.participants) ? r.participants : [],
      patientCareReports: patientCare || [],
      driverTripTicket: tripTicket[0] || null,
    };

    return NextResponse.json(formatted);

  } catch (error) {
    console.error("Error in GET /api/reports/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
