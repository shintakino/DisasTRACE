import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";
import { patientCareReports, driverTripTickets } from "@/db/schema/patient_care";
import { eq, and, or, like, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import crypto from "crypto";

const SubmitReportSchema = z.object({
  incidentId: z.string().uuid(),
  description: z.string().optional(),
  scenePhotos: z.array(z.string()).optional(),
  participants: z.array(z.any()).optional(),
  patientCareReports: z.array(z.object({
    patientName: z.string(),
    patientAddress: z.string().optional().nullable(),
    patientContact: z.string().optional().nullable(),
    patientAge: z.number().optional().nullable(),
    patientGender: z.string().optional().nullable(),
    dispatchInfo: z.any().optional().nullable(),
    emergencyType: z.any().optional().nullable(),
    incidentInfo: z.any().optional().nullable(),
    initialAssessment: z.any().optional().nullable(),
    vitalsLogs: z.array(z.any()).optional().nullable(),
    sampleHistory: z.any().optional().nullable(),
    traumaMarkers: z.array(z.any()).optional().nullable(),
    narrativeReport: z.string().optional().nullable(),
    handoffSignatures: z.any().optional().nullable(),
    liabilityRelease: z.any().optional().nullable(),
    respondingTeam: z.any().optional().nullable(),
  })).optional(),
  driverTripTicket: z.object({
    driverName: z.string(),
    vehiclePlate: z.string(),
    passengerName: z.string().optional().nullable(),
    placesVisited: z.string().optional().nullable(),
    purpose: z.string().optional().nullable(),
    tripLog: z.any().optional().nullable(),
    gasolineConsumed: z.any().optional().nullable(),
    lubricants: z.any().optional().nullable(),
    speedometer: z.any().optional().nullable(),
    remarks: z.string().optional().nullable(),
    signatures: z.any().optional().nullable(),
  }).optional(),
});


export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    // Fetch active user profile from database to determine role scopes
    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    const category = searchParams.get("category") || "responder";

    if (category === "user") {
      const whereConditions: any[] = [];
      if (userProfile && userProfile.role === 'public_user') {
        whereConditions.push(eq(verificationRequests.residentId, user.id));
      }

      const dbRequests = await db
        .select({
          id: verificationRequests.id,
          requestId: verificationRequests.requestId,
          residentName: users.fullName,
          type: verificationRequests.type,
          status: verificationRequests.status,
          createdAt: verificationRequests.createdAt,
          location: verificationRequests.locationDescription,
          imageUrl: verificationRequests.imageUrl,
          nature: verificationRequests.nature,
          severity: verificationRequests.severity,
          peopleInvolved: verificationRequests.peopleInvolved,
        })
        .from(verificationRequests)
        .innerJoin(users, eq(verificationRequests.residentId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(verificationRequests.createdAt));

      let filtered = [...dbRequests].map((r) => ({
        id: r.id,
        requestId: r.requestId,
        responderName: r.residentName,
        type: r.type,
        status: r.status, // PENDING, VERIFIED, REJECTED, DUPLICATE
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
        residentPhotoUrl: r.imageUrl,
        natureOfCall: r.nature,
        severityLevel: r.severity,
        peopleInvolved: (() => {
          if (!r.peopleInvolved || r.peopleInvolved === 'None') return 0;
          const match = r.peopleInvolved.match(/\d+/);
          return match ? parseInt(match[0], 10) : 1;
        })(),
        crewFindings: "User Submitted Report. No crew findings recorded.",
        scenePhotos: [],
      }));

      if (search) {
        filtered = filtered.filter(
          (r) =>
            r.responderName.toLowerCase().includes(search) ||
            r.type.toLowerCase().includes(search) ||
            r.id.toLowerCase().includes(search) ||
            (r.requestId && r.requestId.toLowerCase().includes(search))
        );
      }

      if (type) {
        filtered = filtered.filter((r) => r.type === type);
      }

      if (status) {
        filtered = filtered.filter((r) => r.status === status);
      }

      return NextResponse.json({
        data: filtered,
        total: filtered.length,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    }

    const whereConditions: any[] = [];

    if (userProfile) {
      if (userProfile.role === 'ambulance_responder') {
        // Ambulance responders can only view incident reports they submitted
        whereConditions.push(eq(reports.responderId, user.id));
      } else if (userProfile.role === 'public_user') {
        // Residents can only view verification reports they created
        whereConditions.push(eq(verificationRequests.residentId, user.id));
      }
    }

    // Fetch reports by joining Drizzle schema tables with dynamic filters
    const dbReports = await db
      .select({
        id: reports.id,
        responderName: users.fullName,
        type: verificationRequests.type,
        status: reports.status,
        createdAt: reports.createdAt,
        location: verificationRequests.locationDescription,
        residentPhotoUrl: verificationRequests.imageUrl,
        natureOfCall: verificationRequests.nature,
        severityLevel: verificationRequests.severity,
        peopleInvolved: verificationRequests.peopleInvolved,
        crewFindings: reports.description,
        scenePhotos: reports.scenePhotos,
      })
      .from(reports)
      .innerJoin(incidents, eq(reports.incidentId, incidents.id))
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .innerJoin(users, eq(reports.responderId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(reports.createdAt));

    let filtered = [...dbReports].map((r) => ({
      id: r.id,
      responderName: r.responderName,
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
      residentPhotoUrl: r.residentPhotoUrl,
      natureOfCall: r.natureOfCall,
      severityLevel: r.severityLevel,
      peopleInvolved: (() => {
        if (!r.peopleInvolved || r.peopleInvolved === 'None') return 0;
        const match = r.peopleInvolved.match(/\d+/);
        return match ? parseInt(match[0], 10) : 1;
      })(),
      crewFindings: r.crewFindings || "No additional logs provided.",
      scenePhotos: Array.isArray(r.scenePhotos) ? r.scenePhotos : [],
    }));

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.responderName.toLowerCase().includes(search) ||
          r.type.toLowerCase().includes(search) ||
          r.id.toLowerCase().includes(search)
      );
    }

    if (type) {
      filtered = filtered.filter((r) => r.type === type);
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Error in GET /api/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = SubmitReportSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { incidentId, description, scenePhotos, participants } = result.data;

    // 1. Fetch incident to verify details
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Generate unique Report ID
    const year = new Date().getFullYear();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const reportId = `REP-${year}-${randNum}`;

    // 2. Insert into reports table
    const [newReport] = await db.insert(reports).values({
      id: reportId,
      incidentId,
      responderId: user.id,
      status: "SUBMITTED",
      description: description || "No additional logs provided.",
      scenePhotos: scenePhotos || [],
      participants: participants || [],
    }).returning();

    // 2.1. Insert Patient Care Reports (if provided)
    if (body.patientCareReports && Array.isArray(body.patientCareReports)) {
      for (let i = 0; i < body.patientCareReports.length; i++) {
        const pcr = body.patientCareReports[i];
        const pcrId = `PCR-${year}-${randNum}-${i + 1}`;
        await db.insert(patientCareReports).values({
          id: pcrId,
          incidentId,
          patientName: pcr.patientName,
          patientAddress: pcr.patientAddress || null,
          patientContact: pcr.patientContact || null,
          patientAge: pcr.patientAge || null,
          patientGender: pcr.patientGender || null,
          dispatchInfo: pcr.dispatchInfo || null,
          emergencyType: pcr.emergencyType || null,
          incidentInfo: pcr.incidentInfo || null,
          initialAssessment: pcr.initialAssessment || null,
          vitalsLogs: pcr.vitalsLogs || null,
          sampleHistory: pcr.sampleHistory || null,
          traumaMarkers: pcr.traumaMarkers || null,
          narrativeReport: pcr.narrativeReport || null,
          handoffSignatures: pcr.handoffSignatures || null,
          liabilityRelease: pcr.liabilityRelease || null,
          respondingTeam: pcr.respondingTeam || null,
        });
      }
      console.log(`Successfully saved ${body.patientCareReports.length} patient care report(s).`);
    }

    // 2.2. Insert Driver Trip Ticket (if provided)
    if (body.driverTripTicket) {
      const dtt = body.driverTripTicket;
      const dttId = `DTT-${year}-${randNum}`;
      await db.insert(driverTripTickets).values({
        id: dttId,
        incidentId,
        driverName: dtt.driverName,
        vehiclePlate: dtt.vehiclePlate,
        passengerName: dtt.passengerName || null,
        placesVisited: dtt.placesVisited || null,
        purpose: dtt.purpose || null,
        tripLog: dtt.tripLog || null,
        gasolineConsumed: dtt.gasolineConsumed || null,
        lubricants: dtt.lubricants || null,
        speedometer: dtt.speedometer || null,
        remarks: dtt.remarks || null,
        signatures: dtt.signatures || null,
      });
      console.log(`Successfully saved driver trip ticket.`);
    }


    // 3. Update parent incident to RESOLVED and set resolvedAt
    await db.update(incidents)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
      })
      .where(eq(incidents.id, incidentId));

    // 4. Reset responder status back to ON_DUTY so they become available for new dispatches
    await db.update(users)
      .set({ dutyStatus: "ON_DUTY" })
      .where(eq(users.id, user.id));

    // 5. Send report audit status update notification if their updates setting is enabled (defaults to true)
    const updatesEnabled = user.user_metadata?.notification_preferences?.updates !== false;
    if (updatesEnabled) {
      const notifId = crypto.randomUUID();
      await db.insert(notifications).values({
        id: notifId,
        userId: user.id,
        type: "report_audited",
        title: "Report Audited",
        body: `Your incident report ${reportId} has been successfully submitted and audited in our registers.`,
        unread: true,
        createdAt: new Date(),
        metadata: {
          reportId: reportId,
          incidentId: incidentId,
          category: "report_update"
        }
      });
    }

    return NextResponse.json({
      success: true,
      report: newReport,
      message: "Incident report successfully submitted. Incident resolved."
    });
  } catch (error) {
    console.error("Error in POST /api/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
