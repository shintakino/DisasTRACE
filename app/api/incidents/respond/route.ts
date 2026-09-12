import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq, and, gt, isNull } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { cascadeIncident, calculateHaversineDistance, checkAndCascadeExpiredOffers, notifyPaccAndCdrrmo } from "@/lib/dispatch-engine";
import { canCascadeDispatchOffer, canResponderAcceptDispatchOffer } from "@/lib/dispatch-policy";

const RespondSchema = z.object({
  incidentId: z.string().min(1, "Incident ID is required"),
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

    // A responder may only act on their own current offer. REJECT remains
    // valid after expiry so the foreground client can release immediately;
    // ACCEPT is intentionally stricter and must beat the server deadline.
    if (!canCascadeDispatchOffer(incident, user.id)) {
      return NextResponse.json({ error: "Conflict: This offer is no longer valid or belongs to another responder" }, { status: 409 });
    }

    if (action === 'ACCEPT') {
      if (!canResponderAcceptDispatchOffer(incident, user.id)) {
        // Trigger recovery now rather than waiting for the next scheduler tick.
        await checkAndCascadeExpiredOffers();
        return NextResponse.json(
          { error: "Conflict: This offer has expired or was reassigned" },
          { status: 409 },
        );
      }
      // Generate deterministic vehicle ID based on initials and unique UUID suffix (Option 1)
      const initials = dbUser.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
      const suffix = dbUser.id.slice(-3).toUpperCase();
      const vehicleId = `AMB-${initials || "001"}-${suffix}`;

      // Claim the offer before the optional ETA calculation. The conditional
      // update remains the authority for expiry, but no database work unrelated
      // to ownership can consume the last seconds of a valid offer.
      const updatedIncident = await db.transaction(async (tx) => {
        const [accepted] = await tx.update(incidents)
          .set({
            status: 'EN_ROUTE',
            responderId: user.id,
            currentOfferResponderId: null,
            offerExpiresAt: null,
            assignedAmbulance: vehicleId,
          })
          .where(and(
            eq(incidents.id, incidentId),
            eq(incidents.status, 'DISPATCHED'),
            eq(incidents.currentOfferResponderId, user.id),
            isNull(incidents.responderId),
            gt(incidents.offerExpiresAt, new Date()),
          ))
          .returning();

        if (!accepted) return null;

        await tx.update(users)
          .set({ dutyStatus: 'ACTIVE_DISPATCH' })
          .where(and(
            eq(users.id, user.id),
            eq(users.role, 'ambulance_responder'),
            eq(users.status, 'ACTIVE'),
          ));

        return accepted;
      });

      if (!updatedIncident) {
        return NextResponse.json(
          { error: "Conflict: This offer was already accepted, expired, or reassigned" },
          { status: 409 },
        );
      }

      // ETA is useful but must never turn a successfully committed acceptance
      // into an apparent client failure. Recalculate it after ownership is
      // safely committed, and only while this responder still owns the trip.
      let request: typeof verificationRequests.$inferSelect | undefined;
      let responseIncident = updatedIncident;
      try {
        request = await db.query.verificationRequests.findFirst({
          where: eq(verificationRequests.id, incident.requestId),
        });

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
            const offsetIndex = dbUser.email.includes("responder")
              ? (Number(dbUser.email.replace(/[^0-9]/g, '')) || 1)
              : (dbUser.id.charCodeAt(0) % 5 + 1);
            resLat = reqLat + 0.0015 * offsetIndex;
            resLng = reqLng + 0.0015 * offsetIndex;
          }

          const recalculatedEta = Math.max(2, Math.round(calculateHaversineDistance(reqLat, reqLng, resLat, resLng) * 5));
          const [incidentWithEta] = await db.update(incidents)
            .set({ etaMinutes: recalculatedEta })
            .where(and(
              eq(incidents.id, incidentId),
              eq(incidents.responderId, user.id),
              eq(incidents.status, 'EN_ROUTE'),
            ))
            .returning();
          responseIncident = incidentWithEta ?? responseIncident;
        }
      } catch (error) {
        console.error('Dispatch accepted, but ETA recalculation failed:', error);
      }

      // Notification delivery is advisory. A transient notification failure
      // must not make a committed acceptance look unsuccessful to the responder.
      const reqNum = request?.requestId || request?.id || incident.requestId;
      const isManual = incident.dispatchMethod === "PACC_MANUAL";
      try {
        await notifyPaccAndCdrrmo({
          title: isManual ? "Manual Dispatch Accepted" : "Dispatch Accepted",
          body: `Responder ${dbUser.fullName} ACCEPTED the dispatch offer for Request #${reqNum}.`,
          type: isManual ? "manual_dispatch_accepted" : "dispatch_accepted",
          metadata: {
            incidentId,
            requestId: incident.requestId,
            responderId: dbUser.id,
            responderName: dbUser.fullName,
            dispatchMethod: incident.dispatchMethod,
          },
        });
      } catch (error) {
        console.error('Dispatch accepted, but acceptance notification failed:', error);
      }

      return NextResponse.json({
        success: true,
        incident: responseIncident,
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
