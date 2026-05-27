import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapResponderSchema } from "@/types/map";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Query active ambulance responders from the users table
    const dbResponders = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        dutyStatus: users.dutyStatus,
        lastLatitude: users.lastLatitude,
        lastLongitude: users.lastLongitude,
        lastLocationUpdatedAt: users.lastLocationUpdatedAt,
      })
      .from(users)
      .where(eq(users.role, "ambulance_responder"));

    const mapped = dbResponders.map((r, i) => {
      let mappedStatus: "AVAILABLE" | "DISPATCHED" | "OFF_DUTY" = "OFF_DUTY";
      if (r.dutyStatus === "ON_DUTY") {
        mappedStatus = "AVAILABLE";
      } else if (r.dutyStatus === "ACTIVE_DISPATCH") {
        mappedStatus = "DISPATCHED";
      }

      // Generate a dynamic, deterministic vehicle ID
      const initials = r.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
      const vehicleId = `AMB-${initials || `00${i + 1}`}`;

      return {
        id: r.id,
        vehicleId,
        status: mappedStatus,
        // Fallback to CDRRMO HQ coordinates if not yet updated
        lat: r.lastLatitude ?? 14.9516,
        lng: r.lastLongitude ?? 120.9011,
        heading: 0,
        lastUpdated: r.lastLocationUpdatedAt
          ? r.lastLocationUpdatedAt.toISOString()
          : new Date().toISOString(),
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

