import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapIncidentSchema } from "@/types/map";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { formatOfficialBaliwagLocation } from "@/lib/report-location";
import { manilaDayBounds, manilaOperationalPeriodBounds } from "@/lib/manila-time";
import { BALIWAG_BARANGAYS } from "@/lib/barangay-boundaries";

const MAP_RECORD_LIMIT = 200;
const MapDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const MapPeriodSchema = z.enum(['today', 'weekly', 'monthly', 'yearly']).optional();
const officialBarangayNames = new Set(BALIWAG_BARANGAYS.map(({ name }) => name));
const MapBarangaySchema = z.string().refine(
  (barangay) => officialBarangayNames.has(barangay),
  'Barangay must be an official City of Baliwag barangay.',
).optional();

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const rawDate = new URL(request.url).searchParams.get('date') ?? undefined;
    const rawPeriod = new URL(request.url).searchParams.get('period') ?? undefined;
    const rawBarangay = new URL(request.url).searchParams.get('barangay') ?? undefined;
    const parsedDate = MapDateSchema.safeParse(rawDate);
    const parsedPeriod = MapPeriodSchema.safeParse(rawPeriod);
    const parsedBarangay = MapBarangaySchema.safeParse(rawBarangay);
    if (!parsedDate.success) {
      return NextResponse.json({ error: 'Date must use YYYY-MM-DD.' }, { status: 400 });
    }
    if (!parsedPeriod.success || (parsedDate.data && parsedPeriod.data)) {
      return NextResponse.json({ error: 'Use either a valid map period or a YYYY-MM-DD date.' }, { status: 400 });
    }
    if (!parsedBarangay.success) {
      return NextResponse.json({ error: 'Barangay must be an official City of Baliwag barangay.' }, { status: 400 });
    }
    const day = parsedDate.data;
    const bounds = day ? manilaDayBounds(day) : parsedPeriod.data ? manilaOperationalPeriodBounds(parsedPeriod.data) : null;
    const incidentScope = bounds
      ? and(gte(incidents.createdAt, bounds.start), lt(incidents.createdAt, bounds.end))
      : inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']);
    const requestScope = bounds
      ? and(gte(verificationRequests.createdAt, bounds.start), lt(verificationRequests.createdAt, bounds.end))
      : inArray(verificationRequests.status, ['PENDING', 'VERIFIED']);
    const incidentWhere = parsedBarangay.data
      ? and(incidentScope, eq(verificationRequests.barangay, parsedBarangay.data))
      : incidentScope;
    const requestWhere = parsedBarangay.data
      ? and(requestScope, eq(verificationRequests.barangay, parsedBarangay.data))
      : requestScope;

    // Default map reads are live operational records only. An explicitly
    // selected day receives a bounded historical slice rather than the full
    // incident archive being transferred to every browser.
    const dbIncidents = await db
      .select({
        id: incidents.id,
        caseId: verificationRequests.requestId,
        assignedAmbulance: incidents.assignedAmbulance,
        responderId: incidents.responderId,
        status: incidents.status,
        type: verificationRequests.type,
        severity: verificationRequests.severity,
        nature: verificationRequests.nature,
        locationDescription: verificationRequests.locationDescription,
        barangay: verificationRequests.barangay,
        latitude: verificationRequests.latitude,
        longitude: verificationRequests.longitude,
        createdAt: incidents.createdAt,
        reporterName: users.fullName,
        reporterPhone: users.phone,
        reporterType: verificationRequests.reporterType,
        contactNumber: verificationRequests.contactNumber,
      })
      .from(incidents)
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .leftJoin(users, eq(verificationRequests.residentId, users.id))
      .where(incidentWhere)
      .orderBy(desc(incidents.createdAt))
      .limit(MAP_RECORD_LIMIT);

    const dbRequests = await db
      .select({
        id: verificationRequests.id,
        caseId: verificationRequests.requestId,
        status: verificationRequests.status,
        type: verificationRequests.type,
        severity: verificationRequests.severity,
        nature: verificationRequests.nature,
        locationDescription: verificationRequests.locationDescription,
        barangay: verificationRequests.barangay,
        latitude: verificationRequests.latitude,
        longitude: verificationRequests.longitude,
        createdAt: verificationRequests.createdAt,
        updatedAt: verificationRequests.updatedAt,
        reporterName: users.fullName,
        reporterPhone: users.phone,
        reporterType: verificationRequests.reporterType,
        contactNumber: verificationRequests.contactNumber,
      })
      .from(verificationRequests)
      .leftJoin(users, eq(verificationRequests.residentId, users.id))
      .where(requestWhere)
      .orderBy(desc(verificationRequests.createdAt))
      .limit(MAP_RECORD_LIMIT);

    const mappedIncidents = dbIncidents.map((inc) => {
      let mappedStatus: "ONGOING" | "COMPLETED" = "ONGOING";
      if (inc.status === "RESOLVED") {
        mappedStatus = "COMPLETED";
      }

      return {
        id: inc.id,
        caseId: inc.caseId,
        vehicleId: inc.assignedAmbulance || "AMB-UNKNOWN",
        severity: inc.severity,
        nature: inc.nature,
        status: mappedStatus,
        type: inc.type,
        origin: "CDRRMO HQ",
        destination: formatOfficialBaliwagLocation(inc.barangay),
        barangay: inc.barangay,
        lat: inc.latitude,
        lng: inc.longitude,
        createdAt: inc.createdAt.toISOString(),
        updatedAt: inc.createdAt.toISOString(),
        category: "responder" as const,
        submittedDate: new Date(inc.createdAt).toLocaleDateString("en-US", {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        submittedTime: new Date(inc.createdAt).toLocaleTimeString("en-US", {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit'
        }),
        lastUpdated: new Date(inc.createdAt).toLocaleString("en-US"),
        reporterName: inc.reporterName || (inc.reporterType === 'GUEST' ? 'Guest Reporter' : 'Resident'),
        reporterPhone: inc.reporterPhone || inc.contactNumber,
      };
    });

    const mappedRequests = dbRequests.map((req) => {
      return {
        id: req.id,
        caseId: req.caseId,
        vehicleId: "NONE",
        severity: req.severity,
        nature: req.nature,
        status: req.status as "PENDING" | "VERIFIED" | "REJECTED" | "DUPLICATE",
        type: req.type,
        origin: "CDRRMO HQ",
        destination: formatOfficialBaliwagLocation(req.barangay),
        barangay: req.barangay,
        lat: req.latitude,
        lng: req.longitude,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        category: "user" as const,
        submittedDate: new Date(req.createdAt).toLocaleDateString("en-US", {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        submittedTime: new Date(req.createdAt).toLocaleTimeString("en-US", {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit'
        }),
        lastUpdated: new Date(req.updatedAt).toLocaleString("en-US"),
        reporterName: req.reporterName || (req.reporterType === 'GUEST' ? 'Guest Reporter' : 'Resident'),
        reporterPhone: req.reporterPhone || req.contactNumber,
      };
    });

    const combined = [...mappedRequests, ...mappedIncidents];
    const validatedData = z.array(MapIncidentSchema).parse(combined);
    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error fetching map incidents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

