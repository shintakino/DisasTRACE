import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { statusLogs } from "@/db/schema/status_logs";
import { patientCareReports, driverTripTickets } from "@/db/schema/patient_care";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { formatOfficialBaliwagLocation, getReportDetailText, getReportLocation } from "@/lib/report-location";
import { formatManilaDate, formatManilaTime } from "@/lib/manila-presentation";

function timelineEntry(action: string, occurredAt: Date | null) {
  return {
    action,
    occurredAt: occurredAt?.toISOString() ?? null,
    date: occurredAt ? formatManilaDate(occurredAt) : null,
    time: occurredAt ? formatManilaTime(occurredAt) : "Not recorded",
  };
}

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

    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = userProfile.role === "pacc_admin" || userProfile.role === "cdrrmo_super_admin";
    const canViewOperationalDetails = isAdmin || userProfile.role === 'ambulance_responder';
    const accessCondition = isAdmin
      ? undefined
      : userProfile.role === "ambulance_responder"
        ? eq(reports.responderId, user.id)
        : userProfile.role === "public_user"
          ? eq(verificationRequests.residentId, user.id)
          : null;

    if (accessCondition === null) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
        barangay: verificationRequests.barangay,
        residentReportDescription: verificationRequests.locationDescription,
        residentPhotoUrl: verificationRequests.imageUrl,
        crewFindings: reports.description,
        natureOfCall: verificationRequests.nature,
        severityLevel: verificationRequests.severity,
        peopleInvolved: verificationRequests.peopleInvolved,
        scenePhotos: reports.scenePhotos,
        participants: reports.participants,
        residentId: verificationRequests.residentId,
        reporterType: verificationRequests.reporterType,
        contactNumber: verificationRequests.contactNumber,
        rejectionReason: verificationRequests.rejectionReason,
        verificationRequestId: verificationRequests.id,
      })
      .from(reports)
      .innerJoin(incidents, eq(reports.incidentId, incidents.id))
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .innerJoin(users, eq(reports.responderId, users.id))
      .where(and(
        or(
          eq(reports.id, id),
          eq(reports.incidentId, id)
        ),
        ...(accessCondition ? [accessCondition] : [])
      ))
      .limit(1);

    if (results.length === 0) {
      // 2. If not found, check verification_requests (user report)
      // Responders may only open a report row that they own. Do not fall back
      // to a raw verification request, which has no responder ownership column.
      if (userProfile.role === 'ambulance_responder') {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      const verificationAccessCondition = userProfile.role === 'public_user'
        ? eq(verificationRequests.residentId, user.id)
        : undefined;
      let userReq = await db.query.verificationRequests.findFirst({
        where: and(
          or(
            eq(verificationRequests.id, id),
            eq(verificationRequests.requestId, id)
          ),
          ...(verificationAccessCondition ? [verificationAccessCondition] : [])
        ),
        with: {
          resident: true,
        }
      });

      // Dashboard and map cards use the incident ID as their stable selection
      // key once dispatch has begun. Before a responder submits a clinical
      // report, that ID has no matching `reports` row, so resolve its linked
      // resident request before declaring the report unavailable.
      if (!userReq) {
        const linkedIncident = await db.query.incidents.findFirst({
          columns: { requestId: true },
          where: eq(incidents.id, id),
        });

        if (linkedIncident) {
          userReq = await db.query.verificationRequests.findFirst({
            where: and(
              eq(verificationRequests.id, linkedIncident.requestId),
              ...(verificationAccessCondition ? [verificationAccessCondition] : []),
            ),
            with: {
              resident: true,
            },
          });
        }
      }

      if (!userReq) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      // Check if there is an associated incident and responder
      const trackingRequestId = userReq.status === 'DUPLICATE' && userReq.parentRequestId
        ? userReq.parentRequestId
        : userReq.id;
      const incident = await db.query.incidents.findFirst({
        where: eq(incidents.requestId, trackingRequestId),
      });

      let responderName = "None Assigned";
      let vehicleId = "N/A";
      if (incident && incident.responderId) {
        const responder = await db.query.users.findFirst({
          where: eq(users.id, incident.responderId),
        });
        if (responder) {
          responderName = responder.fullName;
          vehicleId = incident.assignedAmbulance || "N/A";
        }
      }

      const formatted = {
        id: userReq.requestId || userReq.id,
        incidentId: incident?.id || userReq.id,
        responderName: responderName,
        vehicleId: vehicleId,
        type: userReq.type,
        status: userReq.status, // PENDING, VERIFIED, REJECTED, DUPLICATE
        rejectionReason: userReq.rejectionReason,
        incidentStatus: incident?.status ?? null,
        date: formatManilaDate(userReq.createdAt),
        time: formatManilaTime(userReq.createdAt),
        location: formatOfficialBaliwagLocation(userReq.barangay),
        barangay: userReq.barangay,
        residentReportDescription: getReportDetailText(userReq.locationDescription, "Awaiting detail logs."),
        residentPhotoUrl: userReq.imageUrl,
        // Public reporters must not receive responder-only documentation, even
        // as a placeholder. Operational roles retain the existing indication
        // that a responder report has not been submitted yet.
        crewFindings: canViewOperationalDetails
          ? "No responder findings available yet (User Submitted Report)."
          : undefined,
        natureOfCall: userReq.nature,
        severityLevel: userReq.severity,
        peopleInvolved: (() => {
          if (!userReq.peopleInvolved || userReq.peopleInvolved === 'None') return 0;
          const match = userReq.peopleInvolved.match(/\d+/);
          return match ? parseInt(match[0], 10) : 1;
        })(),
        residentPeopleInvolved: (() => {
          if (userReq.peopleInvolved === '1-2 Persons') return 2;
          if (userReq.peopleInvolved === '3-5 Persons') return 4;
          if (userReq.peopleInvolved === '6+ Persons') return 6;
          return 0;
        })(),
        scenePhotos: [],
        residentName: userReq.resident?.fullName || (userReq.reporterType === 'GUEST' ? 'Guest Reporter' : 'Anonymous'),
        residentPhone: userReq.resident?.phone || userReq.contactNumber || "N/A",
        residentAddress: userReq.resident?.address || (userReq.reporterType === 'GUEST' ? 'Guest report — no home address collected' : 'N/A'),
        logs: [
          timelineEntry("Incident Reported by Resident", userReq.createdAt),
          ...(userReq.status === "VERIFIED" ? [timelineEntry("Incident Verified by Dispatcher", userReq.updatedAt)] : []),
          ...(userReq.status === "REJECTED" ? [timelineEntry("Incident Rejected by Dispatcher", userReq.updatedAt)] : []),
          ...(userReq.status === "DUPLICATE" ? [timelineEntry("Incident Merged as Duplicate", userReq.updatedAt)] : []),
        ],
        participants: [],
      };

      // Fetch duplicates for the resident request
      const dbDuplicates = isAdmin ? await db
        .select({
          id: verificationRequests.id,
          requestId: verificationRequests.requestId,
          residentName: users.fullName,
          type: verificationRequests.type,
          status: verificationRequests.status,
          createdAt: verificationRequests.createdAt,
          location: verificationRequests.locationDescription,
          barangay: verificationRequests.barangay,
          imageUrl: verificationRequests.imageUrl,
          nature: verificationRequests.nature,
          severity: verificationRequests.severity,
          peopleInvolved: verificationRequests.peopleInvolved,
        })
        .from(verificationRequests)
        .innerJoin(users, eq(verificationRequests.residentId, users.id))
        .where(eq(verificationRequests.parentRequestId, userReq.id)) : [];

      const duplicates = dbDuplicates.map(d => ({
        id: d.id,
        requestId: d.requestId,
        residentName: d.residentName,
        type: d.type,
        status: d.status,
        date: formatManilaDate(d.createdAt),
        time: formatManilaTime(d.createdAt),
        location: formatOfficialBaliwagLocation(d.barangay),
        barangay: d.barangay,
        residentPhotoUrl: d.imageUrl,
        natureOfCall: d.nature,
        severityLevel: d.severity,
        peopleInvolved: (() => {
          if (!d.peopleInvolved || d.peopleInvolved === 'None') return 0;
          const match = d.peopleInvolved.match(/\d+/);
          return match ? parseInt(match[0], 10) : 1;
        })(),
      }));

      return NextResponse.json({ ...formatted, duplicates });
    }

    const r = results[0];
    const lifecycleLogs = await db
      .select({ action: statusLogs.action, createdAt: statusLogs.createdAt })
      .from(statusLogs)
      .where(and(
        eq(statusLogs.incidentId, r.incidentId),
        inArray(statusLogs.action, ["DISPATCHED", "ARRIVED"]),
      ))
      .orderBy(asc(statusLogs.createdAt));
    const dispatchedAt = lifecycleLogs.find((log) => log.action === "DISPATCHED")?.createdAt ?? null;
    const arrivedAt = lifecycleLogs.find((log) => log.action === "ARRIVED")?.createdAt ?? null;

    // Fetch resident user details separately
    let residentName = r.reporterType === 'GUEST' ? 'Guest Reporter' : 'Anonymous';
    let residentPhone = r.contactNumber || "N/A";
    let residentAddress = r.reporterType === 'GUEST' ? 'Guest report — no home address collected' : "N/A";

    if (r.residentId) {
      const resUser = await db.query.users.findFirst({
        where: eq(users.id, r.residentId),
      });
      if (resUser) {
        residentName = resUser.fullName;
        residentPhone = resUser.phone || "N/A";
        residentAddress = resUser.address || "N/A";
      }
    }

    // Fetch associated Patient Care Reports and Driver Trip Ticket
    const patientCare = canViewOperationalDetails ? await db
      .select()
      .from(patientCareReports)
      .where(eq(patientCareReports.incidentId, r.incidentId)) : [];

    const tripTicket = canViewOperationalDetails ? await db
      .select()
      .from(driverTripTickets)
      .where(eq(driverTripTickets.incidentId, r.incidentId))
      .limit(1) : [];

    const normalizedPatientCare = patientCare.map((item) => ({
      ...item,
      patientAddress: getReportLocation(item.patientAddress, "N/A"),
    }));
    const normalizedTripTicket = tripTicket[0]
      ? {
          ...tripTicket[0],
          placesVisited: getReportLocation(tripTicket[0].placesVisited, "N/A"),
        }
      : null;

    // Format output matching DetailedIncidentReport typescript contract
    const formatted = {
      id: r.id,
      incidentId: r.incidentId,
      responderName: r.responderName,
      vehicleId: r.vehicleId || "N/A",
      type: r.type,
      status: r.status === 'SUBMITTED' ? 'COMPLETED' : 'ONGOING',
      rejectionReason: r.rejectionReason,
      incidentStatus: 'RESOLVED',
      date: formatManilaDate(r.createdAt),
      time: formatManilaTime(r.createdAt),
      location: formatOfficialBaliwagLocation(r.barangay),
      barangay: r.barangay,
      residentReportDescription: getReportDetailText(r.residentReportDescription, "Awaiting detail logs."),
      residentPhotoUrl: r.residentPhotoUrl,
      // Keep crew documentation inside the responder/admin boundary. Omitting
      // the field for Public Users prevents a client from treating an
      // operational note as public report content.
      crewFindings: canViewOperationalDetails
        ? (r.crewFindings || "No findings recorded.")
        : undefined,
      natureOfCall: r.natureOfCall,
      severityLevel: r.severityLevel,
      peopleInvolved: (() => {
        if (patientCare && patientCare.length > 0) {
          return patientCare.length;
        }
        if (Array.isArray(r.participants) && r.participants.length > 0) {
          return r.participants.length;
        }
        if (!r.peopleInvolved || r.peopleInvolved === 'None') return 0;
        const match = r.peopleInvolved.match(/\d+/);
        return match ? parseInt(match[0], 10) : 1;
      })(),
      residentPeopleInvolved: (() => {
        if (r.peopleInvolved === '1-2 Persons') return 2;
        if (r.peopleInvolved === '3-5 Persons') return 4;
        if (r.peopleInvolved === '6+ Persons') return 6;
        return 0;
      })(),
      scenePhotos: canViewOperationalDetails && Array.isArray(r.scenePhotos) ? r.scenePhotos : [],
      residentName: residentName,
      residentPhone: residentPhone,
      residentAddress: residentAddress,
      logs: [
        timelineEntry("Incident Dispatched", dispatchedAt),
        timelineEntry("Ambulance Arrived at Scene", arrivedAt),
        timelineEntry("Report Logs Submitted", r.createdAt),
      ],
      participants: canViewOperationalDetails && Array.isArray(r.participants) ? r.participants : [],
      patientCareReports: canViewOperationalDetails ? normalizedPatientCare : [],
      driverTripTicket: canViewOperationalDetails ? normalizedTripTicket : null,
    };

    // Fetch duplicates for the responder report's associated verification request
    const dbDuplicates = canViewOperationalDetails ? await db
      .select({
        id: verificationRequests.id,
        requestId: verificationRequests.requestId,
        residentName: users.fullName,
        type: verificationRequests.type,
        status: verificationRequests.status,
        createdAt: verificationRequests.createdAt,
        location: verificationRequests.locationDescription,
        barangay: verificationRequests.barangay,
        imageUrl: verificationRequests.imageUrl,
        nature: verificationRequests.nature,
        severity: verificationRequests.severity,
        peopleInvolved: verificationRequests.peopleInvolved,
      })
      .from(verificationRequests)
      .innerJoin(users, eq(verificationRequests.residentId, users.id))
      .where(eq(verificationRequests.parentRequestId, r.verificationRequestId)) : [];

    const duplicates = dbDuplicates.map(d => ({
      id: d.id,
      requestId: d.requestId,
      residentName: d.residentName,
      type: d.type,
      status: d.status,
      date: formatManilaDate(d.createdAt),
      time: formatManilaTime(d.createdAt),
      location: formatOfficialBaliwagLocation(d.barangay),
      barangay: d.barangay,
      residentPhotoUrl: d.imageUrl,
      natureOfCall: d.nature,
      severityLevel: d.severity,
      peopleInvolved: (() => {
        if (!d.peopleInvolved || d.peopleInvolved === 'None') return 0;
        const match = d.peopleInvolved.match(/\d+/);
        return match ? parseInt(match[0], 10) : 1;
      })(),
    }));

    return NextResponse.json({ ...formatted, duplicates });

  } catch (error) {
    console.error("Error in GET /api/reports/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
