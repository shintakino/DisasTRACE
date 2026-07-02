import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { and, eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== "pacc_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    const whereConditions = [
      eq(users.role, "ambulance_responder"),
      eq(users.status, "ACTIVE"),
      eq(users.dutyStatus, "ON_DUTY")
    ];

    if (isDevMode) {
      whereConditions.push(eq(users.email, "responder@disastrace.com"));
    }

    // Query active and clocked-in responders
    const activeResponders = await db.query.users.findMany({
      where: and(...whereConditions),
    });

    const mappedResponders = activeResponders.map((r) => {
      const isDevResponder = isDevMode && r.email === "responder@disastrace.com";
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const isRecent = r.lastLocationUpdatedAt && new Date(r.lastLocationUpdatedAt) >= fifteenMinutesAgo;
      const status = (isDevResponder || isRecent) ? "STANDBY" : "OFFLINE";

      return {
        id: r.id,
        fullName: r.fullName,
        phone: r.phone || "N/A",
        address: r.address || "Baliwag City",
        status,
        lat: r.lastLatitude,
        lng: r.lastLongitude,
        responderType: r.responderType,
      };
    });

    // Split standard CDRRMO HQ responders vs Barangay Rescue Units
    const cdrrmo = mappedResponders.filter((r) => {
      if (r.responderType) {
        return r.responderType === "cdrrmo_hq";
      }
      return (
        !r.fullName.toLowerCase().includes("barangay") &&
        !r.fullName.toLowerCase().includes("rescue")
      );
    });

    const barangay = mappedResponders.filter((r) => {
      if (r.responderType) {
        return r.responderType === "barangay";
      }
      return (
        r.fullName.toLowerCase().includes("barangay") ||
        r.fullName.toLowerCase().includes("rescue")
      );
    });

    return NextResponse.json({
      success: true,
      cdrrmo,
      barangay,
    });
  } catch (error) {
    console.error("Error fetching available responders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
