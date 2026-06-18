import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapIncidentSchema } from "@/types/map";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Query active incidents from the database joined with verification requests for locations
    const dbIncidents = await db
      .select({
        id: incidents.id,
        caseId: verificationRequests.requestId,
        assignedAmbulance: incidents.assignedAmbulance,
        status: incidents.status,
        type: verificationRequests.type,
        locationDescription: verificationRequests.locationDescription,
        latitude: verificationRequests.latitude,
        longitude: verificationRequests.longitude,
        createdAt: incidents.createdAt,
        reporterName: users.fullName,
        reporterPhone: users.phone,
      })
      .from(incidents)
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .innerJoin(users, eq(verificationRequests.residentId, users.id))
      .orderBy(desc(incidents.createdAt));

    // Query all verification requests
    const dbRequests = await db
      .select({
        id: verificationRequests.id,
        caseId: verificationRequests.requestId,
        status: verificationRequests.status,
        type: verificationRequests.type,
        locationDescription: verificationRequests.locationDescription,
        latitude: verificationRequests.latitude,
        longitude: verificationRequests.longitude,
        createdAt: verificationRequests.createdAt,
        updatedAt: verificationRequests.updatedAt,
        reporterName: users.fullName,
        reporterPhone: users.phone,
      })
      .from(verificationRequests)
      .innerJoin(users, eq(verificationRequests.residentId, users.id))
      .orderBy(desc(verificationRequests.createdAt));

    const mappedIncidents = dbIncidents.map((inc) => {
      let mappedStatus: "ONGOING" | "COMPLETED" = "ONGOING";
      if (inc.status === "RESOLVED") {
        mappedStatus = "COMPLETED";
      }

      return {
        id: inc.id,
        caseId: inc.caseId,
        vehicleId: inc.assignedAmbulance || "AMB-UNKNOWN",
        status: mappedStatus,
        type: inc.type,
        origin: "CDRRMO HQ",
        destination: inc.locationDescription || "Baliwag City",
        lat: inc.latitude,
        lng: inc.longitude,
        createdAt: inc.createdAt.toISOString(),
        updatedAt: inc.createdAt.toISOString(),
        category: "responder" as const,
        submittedDate: new Date(inc.createdAt).toLocaleDateString("en-US", {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        submittedTime: new Date(inc.createdAt).toLocaleTimeString("en-US", {
          hour: '2-digit',
          minute: '2-digit'
        }),
        lastUpdated: new Date(inc.createdAt).toLocaleString("en-US"),
        reporterName: inc.reporterName,
        reporterPhone: inc.reporterPhone,
      };
    });

    const mappedRequests = dbRequests.map((req) => {
      return {
        id: req.id,
        caseId: req.caseId,
        vehicleId: "NONE",
        status: req.status as "PENDING" | "VERIFIED" | "REJECTED" | "DUPLICATE",
        type: req.type,
        origin: "CDRRMO HQ",
        destination: req.locationDescription || "Baliwag City",
        lat: req.latitude,
        lng: req.longitude,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        category: "user" as const,
        submittedDate: new Date(req.createdAt).toLocaleDateString("en-US", {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        submittedTime: new Date(req.createdAt).toLocaleTimeString("en-US", {
          hour: '2-digit',
          minute: '2-digit'
        }),
        lastUpdated: new Date(req.updatedAt).toLocaleString("en-US"),
        reporterName: req.reporterName,
        reporterPhone: req.reporterPhone,
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

