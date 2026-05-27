import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapIncidentSchema } from "@/types/map";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
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
      })
      .from(incidents)
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .orderBy(desc(incidents.createdAt));

    const mapped = dbIncidents.map((inc) => {
      let mappedStatus: "NEW" | "ONGOING" | "COMPLETED" | "STANDBY" = "NEW";
      if (inc.status === "RESOLVED") {
        mappedStatus = "COMPLETED";
      } else if (inc.status === "DISPATCHED") {
        mappedStatus = "NEW";
      } else if (inc.status === "EN_ROUTE" || inc.status === "ARRIVED") {
        mappedStatus = "ONGOING";
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
      };
    });

    const validatedData = z.array(MapIncidentSchema).parse(mapped);
    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error fetching map incidents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

