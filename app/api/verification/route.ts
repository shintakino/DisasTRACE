import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { createClient } from "@/lib/supabase-server";
import { and, count, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { formatOfficialBaliwagLocation } from "@/lib/report-location";
import { INCIDENT_DEDUPLICATION_RADIUS_METERS } from "@/lib/incident-deduplication";
import { findReportConsolidation } from '@/lib/emergency-intake';
import { resolveBaliwagBarangay } from "@/lib/barangay-boundaries";
import { systemSettings } from "@/db/schema/system_settings";
import { requiresPaccReassignment } from "@/lib/dispatch-policy";
import { createPublicRequestId, deriveInitialTriage } from "@/lib/initial-triage-policy";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for PACC Admin role
    const role = user?.app_metadata?.role;
    if (role !== "pacc_admin") {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Bound active work and terminal history independently. A burst of recent
    // rejected/closed records must never push an older actionable report out
    // of PACC's queue window.
    const [activeRequestRows, terminalRequestRows] = await Promise.all([
      db.select({ id: verificationRequests.id })
        .from(verificationRequests)
        .leftJoin(incidents, eq(incidents.requestId, verificationRequests.id))
        .where(or(
          and(eq(verificationRequests.status, 'PENDING'), isNull(verificationRequests.possibleDuplicateOfId)),
          and(
            eq(verificationRequests.status, 'VERIFIED'),
            eq(incidents.status, 'DISPATCHED'),
            isNull(incidents.responderId),
          ),
        ))
        .orderBy(desc(verificationRequests.createdAt)),
      db.select({ id: verificationRequests.id })
        .from(verificationRequests)
        .leftJoin(incidents, eq(incidents.requestId, verificationRequests.id))
        .where(or(
          eq(verificationRequests.status, 'REJECTED'),
          and(
            eq(verificationRequests.status, 'VERIFIED'),
            eq(incidents.status, 'RESOLVED'),
          ),
        ))
        .orderBy(desc(verificationRequests.createdAt))
        .limit(50),
    ]);
    const visibleRequestIds = [...new Set(
      [...activeRequestRows, ...terminalRequestRows].map((row) => row.id),
    )];
    const requests = visibleRequestIds.length
      ? await db.query.verificationRequests.findMany({
        where: inArray(verificationRequests.id, visibleRequestIds),
        orderBy: [desc(verificationRequests.createdAt)],
        with: { resident: true },
      })
      : [];

    const requestIds = requests.map((request) => request.id);
    const residentIds = [...new Set(
      requests.flatMap((request) => request.residentId ? [request.residentId] : []),
    )];

    // Resolve all related incidents and resident history in bounded queries.
    // The former implementation issued up to three queries for every queue
    // item, which could exhaust the connection pool and stall PACC loading.
    const [requestIncidents, residentReportCounts, residentRejectedCounts, relatedRequests] = await Promise.all([
      requestIds.length
        ? db.select().from(incidents).where(inArray(incidents.requestId, requestIds))
        : Promise.resolve([]),
      residentIds.length
        ? db.select({ residentId: verificationRequests.residentId, total: count() })
          .from(verificationRequests)
          .where(inArray(verificationRequests.residentId, residentIds))
          .groupBy(verificationRequests.residentId)
        : Promise.resolve([]),
      residentIds.length
        ? db.select({ residentId: verificationRequests.residentId, total: count() })
          .from(verificationRequests)
          .where(and(
            inArray(verificationRequests.residentId, residentIds),
            eq(verificationRequests.status, 'REJECTED'),
          ))
          .groupBy(verificationRequests.residentId)
        : Promise.resolve([]),
      requestIds.length
        ? db.query.verificationRequests.findMany({
          where: or(
            inArray(verificationRequests.parentRequestId, requestIds),
            inArray(verificationRequests.possibleDuplicateOfId, requestIds),
          ),
          orderBy: [desc(verificationRequests.createdAt)],
          with: { resident: true },
        })
        : Promise.resolve([]),
    ]);

    const incidentByRequestId = new Map(requestIncidents.map((incident) => [incident.requestId, incident]));
    const reportCountByResidentId = new Map(
      residentReportCounts.flatMap((row) => row.residentId ? [[row.residentId, Number(row.total)] as const] : []),
    );
    const rejectedCountByResidentId = new Map(
      residentRejectedCounts.flatMap((row) => row.residentId ? [[row.residentId, Number(row.total)] as const] : []),
    );
    const relatedReportsByParentId = new Map<string, Array<{
      id: string;
      requestId: string;
      status: string;
      relation: 'LINKED' | 'PACC_REVIEW';
      receivedAt: string;
      reporterName: string;
      contactNumber: string;
      location: string;
      imageUrl?: string;
    }>>();
    for (const related of relatedRequests) {
      const parentId = related.parentRequestId ?? related.possibleDuplicateOfId;
      if (!parentId) continue;
      const entries = relatedReportsByParentId.get(parentId) ?? [];
      entries.push({
        id: related.id,
        requestId: related.requestId,
        status: related.status,
        relation: related.parentRequestId ? 'LINKED' : 'PACC_REVIEW',
        receivedAt: related.createdAt.toISOString(),
        reporterName: related.resident?.fullName || 'Guest Reporter',
        contactNumber: related.resident?.phone || related.contactNumber || 'No phone provided',
        location: formatOfficialBaliwagLocation(related.barangay),
        imageUrl: related.imageUrl || undefined,
      });
      relatedReportsByParentId.set(parentId, entries);
    }

    const mappedRequests = requests.map((r) => {
      const incident = incidentByRequestId.get(r.id);
      const resident = r.resident;
      const totalReports = r.residentId ? reportCountByResidentId.get(r.residentId) ?? 0 : 0;
      const totalRejectedReports = r.residentId ? rejectedCountByResidentId.get(r.residentId) ?? 0 : 0;
      const priorReportsCount = Math.max(0, totalReports - 1);
      const rejectedReportsCount = Math.max(0, totalRejectedReports - (r.status === 'REJECTED' ? 1 : 0));

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
      const needsPaccReassignment = requiresPaccReassignment(incident);

      return {
        id: r.id,
        requestId: r.requestId,
        status: r.status,
        rejectionReason: r.rejectionReason,
        triageClassification: r.triageClassification,
        triageReasons: r.triageReasons,
        coordinationAgencies: r.coordinationAgencies,
        reporterType: r.reporterType,
        nature: r.nature,
        severity: r.severity,
        type: r.type,
        location: formatOfficialBaliwagLocation(r.barangay),
        peopleInvolved: peopleCount,
        imageUrl: imageUrlStr,
        photoLatitude: r.photoLatitude ?? undefined,
        photoLongitude: r.photoLongitude ?? undefined,
        receivedAt: r.createdAt.toISOString(),
        resident: {
          id: resident?.id || 'guest',
          fullName: resident?.fullName || 'Guest Reporter',
          phone: resident?.phone || r.contactNumber || "No phone provided",
          address: resident?.address || 'Guest report — no home address collected',
          priorReports: priorReportsCount,
          isVerified: resident?.verificationStatus === 'APPROVED',
          reliabilityScore,
        },
        incident: incident ? {
          id: incident.id,
          status: incident.status,
          responderId: incident.responderId,
          currentOfferResponderId: incident.currentOfferResponderId,
          offerExpiresAt: incident.offerExpiresAt?.toISOString() ?? null,
          dispatchMethod: incident.dispatchMethod
        } : null,
        // Keep an exhausted automatic offer in the action queue. It is not a
        // completed verification: PACC must choose the next available unit.
        requiresPaccReassignment: needsPaccReassignment,
        relatedReports: relatedReportsByParentId.get(r.id) ?? [],
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

    // Verify resident account status in database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.status === 'SUSPENDED' || dbUser.status === 'DEACTIVATED' || dbUser.verificationStatus !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        message: 'Your account is suspended, deactivated, or unverified. Emergency report submission is disabled.' 
      }, { status: 403 });
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

    const reportLatitude = Number(latitude);
    const reportLongitude = Number(longitude);
    if (!incidentType || !Number.isFinite(reportLatitude) || !Number.isFinite(reportLongitude)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const barangay = resolveBaliwagBarangay(reportLatitude, reportLongitude);
    if (!barangay) {
      return NextResponse.json({
        error: 'Outside service area',
        message: 'Reports must be submitted from inside the Baliwag City service area.',
      }, { status: 400 });
    }

    const databaseId = crypto.randomUUID();
    const requestIdStr = createPublicRequestId(databaseId);

    // Nature and initial classification are server-owned. In particular,
    // Unknown Cause always waits for PACC to identify the coordinating agency.
    const severityLevel = severity || 'Medium';
    const initialTriage = deriveInitialTriage({
      incidentType,
      requestedNature: nature,
    });
    const requestNature = initialTriage.nature;
    const settings = await db.query.systemSettings.findFirst({ where: eq(systemSettings.id, 'current'), columns: { deduplicationRadiusMeters: true } });
    const consolidation = await findReportConsolidation({
      incidentType,
      nature: requestNature,
      latitude: reportLatitude,
      longitude: reportLongitude,
    }, settings?.deduplicationRadiusMeters ?? INCIDENT_DEDUPLICATION_RADIUS_METERS);
    const triage = deriveInitialTriage({
      incidentType,
      requestedNature: nature,
      suspicious: consolidation.kind === 'PACC_REVIEW_NON_EMERGENCY',
    });
    const triageReasons = [
      ...triage.reasons,
      ...(consolidation.kind === 'AUTO_LINK_EMERGENCY'
        ? ['Automatically linked to an active emergency response with the same type, location range, and time window.']
        : consolidation.kind === 'PACC_REVIEW_NON_EMERGENCY'
          ? ['A similar non-emergency request is awaiting PACC confirmation before any reports are linked.']
        : []),
    ];

    // Insert into database
    const [newRequest] = await db.insert(verificationRequests).values({
      id: databaseId,
      requestId: requestIdStr,
      residentId: user.id,
      status: consolidation.kind === 'AUTO_LINK_EMERGENCY' ? 'DUPLICATE' : 'PENDING',
      parentRequestId: consolidation.kind === 'AUTO_LINK_EMERGENCY' ? consolidation.parentRequestId : null,
      possibleDuplicateOfId: consolidation.kind === 'PACC_REVIEW_NON_EMERGENCY' ? consolidation.parentRequestId : null,
      nature: requestNature,
      type: incidentType,
      peopleInvolved: peopleInvolved || 'None',
      severity: severityLevel,
      triageClassification: triage.classification,
      triageReasons,
      locationDescription: landmarks || null,
      barangay: barangay.name,
      barangayPsgcCode: barangay.psgcCode,
      latitude: reportLatitude,
      longitude: reportLongitude,
      imageUrl: imageUrl || null,
    }).returning();

    // An emergency linked to an active primary must never create another
    // incident or responder offer. The reporter follows that primary instead.
    if (consolidation.kind === 'AUTO_LINK_EMERGENCY') {
      const incident = await db.query.incidents.findFirst({ where: eq(incidents.requestId, consolidation.parentRequestId) });
      return NextResponse.json({
        success: true,
        request: newRequest,
        incident: incident ?? null,
        autoDispatched: Boolean(incident),
        consolidation,
      });
    }

    // Auto Dispatch Logic
    if (triage.classification === 'HIGH_CONFIDENCE_EMERGENCY') {
      const { retryPendingAutomaticDispatches } = await import('@/lib/dispatch-engine');
      const nextIncident = await retryPendingAutomaticDispatches();
      const incident = nextIncident?.requestId === newRequest.id ? nextIncident : null;
      
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
      autoDispatched: false,
      consolidation,
    });
  } catch (error) {
    console.error('Error in POST /api/verification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
