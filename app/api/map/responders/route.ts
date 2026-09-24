import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapResponderSchema } from "@/types/map";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { isResponderHeartbeatFresh } from "@/lib/dispatch-policy";
import { legacyAmbulanceUnitId } from "@/lib/ambulance-unit";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Never publish every responder as a live unit. Only an on-duty or
    // dispatched responder with a real coordinate can appear on the command
    // map; old/off-duty records remain available in roster/history views.
    const dbResponders = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        dutyStatus: users.dutyStatus,
        lastLatitude: users.lastLatitude,
        lastLongitude: users.lastLongitude,
        lastLocationUpdatedAt: users.lastLocationUpdatedAt,
        unitId: users.unitId,
      })
      .from(users)
      .where(and(
        eq(users.role, "ambulance_responder"),
        inArray(users.dutyStatus, ['ON_DUTY', 'ACTIVE_DISPATCH']),
        isNotNull(users.lastLatitude),
        isNotNull(users.lastLongitude),
      ));

    const activeIncidents = await db
      .select({
        id: incidents.id,
        responderId: incidents.responderId,
        assignedAmbulance: incidents.assignedAmbulance,
        status: incidents.status,
      })
      .from(incidents)
      .where(inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']));

    const activeIncidentByResponder = new Map(
      activeIncidents
        .filter((incident) => incident.responderId && !['RESOLVED', 'DOCUMENTATION_PENDING'].includes(incident.status))
        .map((incident) => [incident.responderId as string, incident])
    );

    const mapped = dbResponders.filter((responder) => (
      responder.dutyStatus === 'ACTIVE_DISPATCH' || isResponderHeartbeatFresh(responder.lastLocationUpdatedAt)
    )).map((r) => {
      const isRecent = isResponderHeartbeatFresh(r.lastLocationUpdatedAt);

      let mappedStatus: "AVAILABLE" | "DISPATCHED" | "OFF_DUTY" = "OFF_DUTY";
      if (r.dutyStatus === "ACTIVE_DISPATCH") {
        mappedStatus = "DISPATCHED";
      } else if (r.dutyStatus === "ON_DUTY" && isRecent) {
        mappedStatus = "AVAILABLE";
      } else {
        mappedStatus = "OFF_DUTY";
      }

      const vehicleId = r.unitId || legacyAmbulanceUnitId(r.fullName, r.id);
      const activeIncident = activeIncidentByResponder.get(r.id);

      return {
        id: r.id,
        responderName: r.fullName,
        vehicleId: activeIncident?.assignedAmbulance || vehicleId,
        status: mappedStatus,
        lat: r.lastLatitude!,
        lng: r.lastLongitude!,
        heading: 0,
        lastUpdated: r.lastLocationUpdatedAt
          ? r.lastLocationUpdatedAt.toISOString()
          : new Date().toISOString(),
        activeIncidentId: activeIncident?.id,
      };
    });

    const validatedData = z.array(MapResponderSchema).parse(mapped);
    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error fetching map responders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

