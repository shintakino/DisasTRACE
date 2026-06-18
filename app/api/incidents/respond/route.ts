import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { cascadeIncident, calculateHaversineDistance } from "@/lib/dispatch-engine";

const RespondSchema = z.object({
  incidentId: z.string().uuid(),
  action: z.enum(['ACCEPT', 'REJECT']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = RespondSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { incidentId, action } = result.data;

    // Parallelize user role and incident queries to reduce latency
    const dbUserPromise = db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
    const incidentPromise = db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    const [dbUser, incident] = await Promise.all([dbUserPromise, incidentPromise]);

    if (!dbUser || dbUser.role !== 'ambulance_responder') {
      return NextResponse.json({ error: "Forbidden: Responder access required" }, { status: 403 });
    }

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Ensure the offer was actually sent to this responder
    if (incident.currentOfferResponderId !== user.id) {
      return NextResponse.json({ error: "Conflict: This offer is no longer valid or belongs to another responder" }, { status: 409 });
    }

    if (action === 'ACCEPT') {
      // Generate deterministic vehicle ID based on initials and unique UUID suffix (Option 1)
      const initials = dbUser.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
      const suffix = dbUser.id.slice(-3).toUpperCase();
      const vehicleId = `AMB-${initials || "001"}-${suffix}`;

      // Recalculate ETA immediately after dispatch acceptance using responder's actual current location and incident coordinates
      const request = await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.id, incident.requestId),
      });

      let recalculatedEta = incident.etaMinutes;
      if (request) {
        let resLat = dbUser.lastLatitude !== null ? Number(dbUser.lastLatitude) : 14.9516;
        let resLng = dbUser.lastLongitude !== null ? Number(dbUser.lastLongitude) : 120.9011;
        
        const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";
        let reqLat = request.latitude;
        let reqLng = request.longitude;

        if (isDevMode) {
          if (reqLat < 14.90 || reqLat > 15.05 || reqLng < 120.80 || reqLng > 121.00) {
            reqLat = 14.945;
            reqLng = 120.895;
          }
          // Deterministic offset to keep coordinates close but separate and sorted
          const offsetIndex = dbUser.email.includes("responder")
            ? (Number(dbUser.email.replace(/[^0-9]/g, '')) || 1)
            : (dbUser.id.charCodeAt(0) % 5 + 1);
          resLat = reqLat + 0.0015 * offsetIndex;
          resLng = reqLng + 0.0015 * offsetIndex;
        }

        const distanceKm = calculateHaversineDistance(reqLat, reqLng, resLat, resLng);
        recalculatedEta = Math.max(2, Math.round(distanceKm * 5));
      }

      // 1. Accept dispatch: Update incident state
      const [updatedIncident] = await db.update(incidents)
        .set({
          status: 'EN_ROUTE',
          responderId: user.id,
          currentOfferResponderId: null,
          offerExpiresAt: null,
          assignedAmbulance: vehicleId,
          etaMinutes: recalculatedEta,
        })
        .where(eq(incidents.id, incidentId))
        .returning();

      // 2. Set responder state to ACTIVE_DISPATCH
      await db.update(users)
        .set({ dutyStatus: 'ACTIVE_DISPATCH' })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        incident: updatedIncident,
        message: "Dispatch offer accepted.",
      });
    } else {
      // REJECT: Decline offer, trigger cascade/reversion engine immediately
      console.log(`Responder ${dbUser.fullName} declined incident offer ${incidentId}. Cascading/reverting immediately...`);
      
      await cascadeIncident(incidentId, user.id);

      return NextResponse.json({
        success: true,
        message: "Dispatch offer declined and cascaded/reverted.",
      });
    }
  } catch (error) {
    console.error("Error in respond incident controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
