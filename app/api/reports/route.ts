import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";
import { patientCareReports, driverTripTickets } from "@/db/schema/patient_care";
import { eq, and, asc, count, desc, gte, ilike, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import crypto from "crypto";
import { PatientCareReportPayloadSchema, DriverTripTicketPayloadSchema } from "@/types/reports";
import { formatOfficialBaliwagLocation, getReportLocation } from "@/lib/report-location";
import {
  parseResponderReportListQuery,
  type ResponderReportListQuery,
} from "@/lib/responder-report-management";
import { manilaRecentReportBounds } from "@/lib/manila-time";
import { parsePublicReportHistoryQuery } from "@/lib/public-report-history";

const SubmitReportSchema = z.object({
  incidentId: z.string().uuid(),
  description: z.string().trim().max(5_000).optional(),
  scenePhotos: z.array(z.string().url().max(2_048)).max(20).optional(),
  participants: z.array(z.unknown()).max(999).optional(),
  patientCareReports: z.array(PatientCareReportPayloadSchema).max(999).optional(),
  driverTripTicket: DriverTripTicketPayloadSchema.optional().nullable(),
}).strict();

const ReporterSourceSchema = z.enum(['all', 'registered', 'guest']).catch('all');

type DuplicateRequest = {
  id: string;
  requestId: string;
  parentRequestId: string | null;
  residentName: string | null;
  type: string;
  status: string;
  createdAt: Date;
  location: string | null;
  barangay: string | null;
  imageUrl: string | null;
  nature: string;
  severity: string;
  peopleInvolved: string;
};


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
    const reporterSource = ReporterSourceSchema.parse(searchParams.get('reporterSource'));
    const reporterSourceCondition = reporterSource === 'guest'
      ? eq(verificationRequests.reporterType, 'GUEST')
      : reporterSource === 'registered'
        ? eq(verificationRequests.reporterType, 'REGISTERED')
        : undefined;

    if (category === "user") {
      const whereConditions: SQL<unknown>[] = [];
      let publicQuery;
      try {
        publicQuery = parsePublicReportHistoryQuery(searchParams);
      } catch {
        return NextResponse.json({ error: 'Invalid public report-history filter.' }, { status: 400 });
      }
      if (userProfile && userProfile.role === 'public_user') {
        whereConditions.push(eq(verificationRequests.residentId, user.id));
      } else if (!userProfile || (userProfile.role !== 'pacc_admin' && userProfile.role !== 'cdrrmo_super_admin')) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (reporterSourceCondition) {
        whereConditions.push(reporterSourceCondition);
      }
      if (publicQuery.type) {
        whereConditions.push(eq(verificationRequests.type, publicQuery.type));
      }
      if (publicQuery.barangay) {
        whereConditions.push(eq(verificationRequests.barangay, publicQuery.barangay));
      }
      if (publicQuery.dateRange !== 'all') {
        const bounds = manilaRecentReportBounds(publicQuery.dateRange);
        whereConditions.push(
          gte(verificationRequests.createdAt, bounds.start),
          lt(verificationRequests.createdAt, bounds.end),
        );
      }

      const publicRequestQuery = db
        .select({
          id: verificationRequests.id,
          requestId: verificationRequests.requestId,
          residentName: users.fullName,
          type: verificationRequests.type,
          status: verificationRequests.status,
          parentRequestId: verificationRequests.parentRequestId,
          rejectionReason: verificationRequests.rejectionReason,
          createdAt: verificationRequests.createdAt,
          location: verificationRequests.locationDescription,
          barangay: verificationRequests.barangay,
          imageUrl: verificationRequests.imageUrl,
          nature: verificationRequests.nature,
          severity: verificationRequests.severity,
          peopleInvolved: verificationRequests.peopleInvolved,
        })
        .from(verificationRequests)
        .leftJoin(users, eq(verificationRequests.residentId, users.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(verificationRequests.createdAt))
        .$dynamic();
      // A resident history remains bounded; command-center users retain their
      // existing complete administrative view of user-submitted reports.
      const dbRequests = userProfile.role === 'public_user'
        ? await publicRequestQuery.limit(100)
        : await publicRequestQuery;

      let filtered = [...dbRequests].map((r) => ({
        id: r.id,
        requestId: r.requestId,
        parentRequestId: r.parentRequestId,
        createdAt: r.createdAt.toISOString(),
        responderName: r.residentName || 'Guest Reporter',
        type: r.type,
        status: r.status, // PENDING, VERIFIED, REJECTED, DUPLICATE
        rejectionReason: r.rejectionReason,
        incidentStatus: null as string | null,
        date: new Date(r.createdAt).toLocaleDateString("en-US", {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        time: new Date(r.createdAt).toLocaleTimeString("en-US", {
          hour: '2-digit',
          minute: '2-digit'
        }),
        location: formatOfficialBaliwagLocation(r.barangay),
        barangay: r.barangay,
        residentPhotoUrl: r.imageUrl,
        natureOfCall: r.nature,
        severityLevel: r.severity,
        peopleInvolved: (() => {
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
        crewFindings: "User Submitted Report. No crew findings recorded.",
        scenePhotos: [],
      }));

      if (dbRequests.length > 0) {
        const requestIds = dbRequests.map((request) => (
          request.status === 'DUPLICATE' && request.parentRequestId
            ? request.parentRequestId
            : request.id
        ));
        const incidentStates = await db
          .select({ requestId: incidents.requestId, status: incidents.status })
          .from(incidents)
          .where(inArray(incidents.requestId, requestIds));
        const incidentStatusByRequest = new Map(
          incidentStates.map((incident) => [incident.requestId, incident.status]),
        );
        filtered = filtered.map((request) => ({
          ...request,
          incidentStatus: incidentStatusByRequest.get(
            request.status === 'DUPLICATE' && request.parentRequestId
              ? request.parentRequestId
              : request.id,
          ) ?? null,
        }));
      }

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

    const whereConditions: SQL<unknown>[] = [];

    if (!userProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (userProfile) {
      if (userProfile.role === 'ambulance_responder') {
        // Ambulance responders can only view incident reports they submitted
        whereConditions.push(eq(reports.responderId, user.id));
      } else if (userProfile.role === 'public_user') {
        // Residents can only view verification reports they created
        whereConditions.push(eq(verificationRequests.residentId, user.id));
      } else if (userProfile.role !== 'pacc_admin' && userProfile.role !== 'cdrrmo_super_admin') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (userProfile.role === 'public_user') {
      return NextResponse.json({ error: "Residents must use their report-history view." }, { status: 403 });
    }
    if (reporterSourceCondition) {
      whereConditions.push(reporterSourceCondition);
    }

    let responderQuery: ResponderReportListQuery | null = null;
    if (userProfile.role === 'ambulance_responder') {
      try {
        responderQuery = parseResponderReportListQuery(searchParams);
      } catch {
        return NextResponse.json({ error: 'Invalid report list query parameters.' }, { status: 400 });
      }

      if (responderQuery.status === 'completed') {
        whereConditions.push(eq(reports.status, 'SUBMITTED'));
      } else if (responderQuery.status === 'ongoing') {
        whereConditions.push(eq(reports.status, 'DRAFT'));
      }
      if (responderQuery.type) {
        whereConditions.push(ilike(verificationRequests.type, `%${responderQuery.type}%`));
      }
      if (responderQuery.barangay) {
        whereConditions.push(eq(verificationRequests.barangay, responderQuery.barangay));
      }
      if (responderQuery.search) {
        const searchCondition = or(
          ilike(reports.id, `%${responderQuery.search}%`),
          ilike(verificationRequests.type, `%${responderQuery.search}%`),
          ilike(verificationRequests.nature, `%${responderQuery.search}%`),
          ilike(verificationRequests.barangay, `%${responderQuery.search}%`),
        );
        if (searchCondition) whereConditions.push(searchCondition);
      }
      if (responderQuery.createdAfter && responderQuery.createdBefore) {
        whereConditions.push(
          gte(reports.createdAt, new Date(responderQuery.createdAfter)),
          lt(reports.createdAt, new Date(responderQuery.createdBefore)),
        );
      }
    }

    // Fetch reports by joining Drizzle schema tables with dynamic filters
    const reportQuery = db
      .select({
        id: reports.id,
        responderName: users.fullName,
        vehicleId: incidents.assignedAmbulance,
        type: verificationRequests.type,
        status: reports.status,
        createdAt: reports.createdAt,
        location: verificationRequests.locationDescription,
        barangay: verificationRequests.barangay,
        residentPhotoUrl: verificationRequests.imageUrl,
        natureOfCall: verificationRequests.nature,
        severityLevel: verificationRequests.severity,
        peopleInvolved: verificationRequests.peopleInvolved,
        crewFindings: reports.description,
        scenePhotos: reports.scenePhotos,
        participants: reports.participants,
        patientCareCount: sql<number>`(select count(*)::int from patient_care_reports where patient_care_reports.incident_id = ${reports.incidentId})`,
        verificationRequestId: verificationRequests.id,
      })
      .from(reports)
      .innerJoin(incidents, eq(reports.incidentId, incidents.id))
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .innerJoin(users, eq(reports.responderId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .$dynamic();

    const dbReports = responderQuery
      ? await reportQuery
          .orderBy(
            responderQuery.sort === 'oldest' ? asc(reports.createdAt) : desc(reports.createdAt),
            responderQuery.sort === 'oldest' ? asc(reports.id) : desc(reports.id),
          )
          .limit(responderQuery.limit)
          .offset((responderQuery.page - 1) * responderQuery.limit)
      : await reportQuery.orderBy(desc(reports.createdAt));

    const responderTotal = responderQuery
      ? Number((await db
          .select({ value: count() })
          .from(reports)
          .innerJoin(incidents, eq(reports.incidentId, incidents.id))
          .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
          .innerJoin(users, eq(reports.responderId, users.id))
          .where(and(...whereConditions)))[0]?.value ?? 0)
      : null;

    // Fetch duplicate requests for all fetched reports
    const primaryRequestIds = dbReports.map(r => r.verificationRequestId).filter(Boolean);
    let allDuplicates: DuplicateRequest[] = [];
    if (primaryRequestIds.length > 0) {
      allDuplicates = await db
        .select({
          id: verificationRequests.id,
          requestId: verificationRequests.requestId,
          parentRequestId: verificationRequests.parentRequestId,
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
        .where(inArray(verificationRequests.parentRequestId, primaryRequestIds));
    }

    let filtered = [...dbReports].map((r) => {
      const duplicatesForReport = allDuplicates
        .filter(d => d.parentRequestId === r.verificationRequestId)
        .map(d => ({
          id: d.id,
          requestId: d.requestId,
          residentName: d.residentName,
          type: d.type,
          status: d.status,
          date: new Date(d.createdAt).toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          time: new Date(d.createdAt).toLocaleTimeString("en-US", {
            hour: '2-digit',
            minute: '2-digit'
          }),
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

      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        responderName: r.responderName,
        vehicleId: r.vehicleId,
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
        location: formatOfficialBaliwagLocation(r.barangay),
        barangay: r.barangay,
        residentPhotoUrl: r.residentPhotoUrl,
        natureOfCall: r.natureOfCall,
        severityLevel: r.severityLevel,
        peopleInvolved: (() => {
          if (r.patientCareCount && r.patientCareCount > 0) {
            return r.patientCareCount;
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
        crewFindings: r.crewFindings || "No additional logs provided.",
        scenePhotos: Array.isArray(r.scenePhotos) ? r.scenePhotos : [],
        duplicates: duplicatesForReport,
      };
    });

    if (!responderQuery && search) {
      filtered = filtered.filter(
        (r) =>
          r.responderName.toLowerCase().includes(search) ||
          r.type.toLowerCase().includes(search) ||
          r.id.toLowerCase().includes(search)
      );
    }

    if (!responderQuery && type) {
      filtered = filtered.filter((r) => r.type === type);
    }

    if (!responderQuery && status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (responderQuery) {
      const total = responderTotal ?? 0;
      return NextResponse.json({
        data: filtered,
        total,
        page: responderQuery.page,
        limit: responderQuery.limit,
        totalPages: Math.max(1, Math.ceil(total / responderQuery.limit)),
      });
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

    const responder = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!responder || responder.role !== 'ambulance_responder' || responder.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Only active ambulance responders can submit an incident report.' }, { status: 403 });
    }

    const body = await req.json();
    const result = SubmitReportSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const {
      incidentId,
      description,
      scenePhotos,
      participants,
      patientCareReports: submittedPatientCareReports,
      driverTripTicket: submittedDriverTripTicket,
    } = result.data;

    // 1. Fetch incident to verify details
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const existingReport = await db.query.reports.findFirst({
      where: eq(reports.incidentId, incidentId),
    });
    if (existingReport) {
      if (existingReport.responderId !== user.id) {
        return NextResponse.json({ error: "This incident already has a submitted report." }, { status: 409 });
      }
    }

    if (incident.responderId !== user.id) {
      return NextResponse.json({
        error: "This response is no longer assigned to you. It may have been reassigned to another responder.",
        code: 'INCIDENT_REASSIGNED',
      }, { status: 403 });
    }

    // Generate a collision-resistant, human-readable report suffix. The old
    // four-digit random number was unsafe when several crews completed calls
    // at the same time.
    const year = new Date().getFullYear();
    const reportSuffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    const reportId = `REP-${year}-${reportSuffix}`;

    // Report, clinical/trip children, incident completion, and responder
    // release form one transaction. A failed child write cannot shrink the
    // available responder pool permanently.
    const completion = await db.transaction(async (tx) => {
      const [lockedIncident] = await tx.select()
        .from(incidents)
        .where(eq(incidents.id, incidentId))
        .for('update');
      if (!lockedIncident || lockedIncident.responderId !== user.id) {
        return { kind: 'reassigned' as const };
      }

      // A retry that waited for another request to finish observes the report
      // only after taking the incident lock and returns the original result.
      const concurrentReport = await tx.query.reports.findFirst({
        where: eq(reports.incidentId, incidentId),
      });
      if (concurrentReport) {
        await tx.update(incidents)
          .set({ status: 'RESOLVED', resolvedAt: lockedIncident.resolvedAt ?? new Date() })
          .where(eq(incidents.id, incidentId));
        const otherActiveIncident = await tx.query.incidents.findFirst({
          where: and(
            eq(incidents.responderId, user.id),
            ne(incidents.id, incidentId),
            ne(incidents.status, 'RESOLVED'),
          ),
          columns: { id: true },
        });
        if (!otherActiveIncident) {
          await tx.update(users)
            .set({ dutyStatus: 'ON_DUTY' })
            .where(and(eq(users.id, user.id), eq(users.dutyStatus, 'ACTIVE_DISPATCH')));
        }
        return { kind: 'existing' as const, report: concurrentReport };
      }

      if (!['ARRIVED', 'DOCUMENTATION_PENDING'].includes(lockedIncident.status)) {
        return { kind: 'not_ready' as const };
      }

      const [insertedReport] = await tx.insert(reports).values({
        id: reportId,
        incidentId,
        responderId: user.id,
        status: "SUBMITTED",
        description: description || "No additional logs provided.",
        scenePhotos: scenePhotos || [],
        participants: participants || [],
      }).returning();

      // 2.1. Insert Patient Care Reports (if provided)
      if (submittedPatientCareReports) {
        for (let i = 0; i < submittedPatientCareReports.length; i++) {
          const pcr = submittedPatientCareReports[i];
          const pcrId = `PCR-${year}-${reportSuffix}-${i + 1}`;
          await tx.insert(patientCareReports).values({
            id: pcrId,
            incidentId,
            patientName: pcr.patientName,
            patientAddress: pcr.patientAddress ? getReportLocation(pcr.patientAddress, "N/A") : null,
            patientContact: pcr.patientContact || null,
            patientAge: pcr.patientAge ?? null,
            patientGender: pcr.patientGender || null,
            dispatchInfo: pcr.dispatchInfo || null,
            emergencyType: pcr.emergencyType || null,
            incidentInfo: pcr.incidentInfo || null,
            initialAssessment: pcr.initialAssessment || null,
            vitalsLogs: pcr.vitalsLogs || null,
            painAssessment: pcr.painAssessment || null,
            gcsPoints: pcr.gcsPoints ?? null,
            sampleHistory: pcr.sampleHistory || null,
            traumaMarkers: pcr.traumaMarkers || null,
            narrativeReport: pcr.narrativeReport || null,
            handoffSignatures: pcr.handoffSignatures || null,
            liabilityRelease: pcr.liabilityRelease || null,
            respondingTeam: pcr.respondingTeam || null,
          });
        }
        console.log(`Successfully saved ${submittedPatientCareReports.length} patient care report(s).`);
      }

      // 2.2. Insert Driver Trip Ticket (if provided)
      if (submittedDriverTripTicket) {
        const dtt = submittedDriverTripTicket;
        const dttId = `DTT-${year}-${reportSuffix}`;
        await tx.insert(driverTripTickets).values({
          id: dttId,
          incidentId,
          driverName: dtt.driverName,
          vehiclePlate: dtt.vehiclePlate,
          passengerName: dtt.passengerName || null,
          placesVisited: dtt.placesVisited ? getReportLocation(dtt.placesVisited, "N/A") : null,
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
      await tx.update(incidents)
        .set({
          status: "RESOLVED",
          resolvedAt: new Date(),
        })
        .where(eq(incidents.id, incidentId));

      // 4. Reset responder status back to ON_DUTY so they become available for new dispatches
      const otherActiveIncident = await tx.query.incidents.findFirst({
        where: and(
          eq(incidents.responderId, user.id),
          ne(incidents.id, incidentId),
          ne(incidents.status, 'RESOLVED'),
        ),
        columns: { id: true },
      });
      if (!otherActiveIncident) {
        await tx.update(users)
          .set({ dutyStatus: "ON_DUTY" })
          .where(and(eq(users.id, user.id), eq(users.dutyStatus, 'ACTIVE_DISPATCH')));
      }

      return { kind: 'created' as const, report: insertedReport };
    });

    if (completion.kind === 'reassigned') {
      return NextResponse.json({
        error: "This response is no longer assigned to you. It may have been reassigned to another responder.",
        code: 'INCIDENT_REASSIGNED',
      }, { status: 403 });
    }
    if (completion.kind === 'not_ready') {
      return NextResponse.json({
        error: 'Arrival at the incident scene must be confirmed before a final report can be submitted.',
        code: 'REPORT_NOT_READY',
      }, { status: 409 });
    }
    if (completion.kind === 'existing') {
      return NextResponse.json({
        success: true,
        report: completion.report,
        alreadySubmitted: true,
        message: "Incident report was already submitted.",
      });
    }
    const newReport = completion.report;

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
