import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { systemSettings } from "@/db/schema/system_settings";
import { eq, ne, and, notInArray } from "drizzle-orm";

// Haversine formula to compute distance in kilometers
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export async function autoDispatchIncident(
  requestId: string,
  residentId: string,
  latitude: number,
  longitude: number
) {
  try {
    // 1. Fetch the verification request to inspect details
    const request = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, requestId),
    });

    if (!request) {
      console.error(`Verification request ${requestId} not found during auto-dispatch`);
      return null;
    }

    // 2. Fetch all clocked-in responders
    // Clocked-in means: role = 'ambulance_responder', status = 'ACTIVE', dutyStatus = 'ON_DUTY'
    const eligibleResponders = await db.query.users.findMany({
      where: and(
        eq(users.role, "ambulance_responder"),
        eq(users.status, "ACTIVE"),
        eq(users.dutyStatus, "ON_DUTY"),
        eq(users.email, "responder@disastrace.com") // Temp restriction to only allow specific responder
      ),
    });

    let reqLat = latitude;
    let reqLng = longitude;

    // Mock request coordinates in Baliwag if outside (for developer off-site testing convenience)
    if (reqLat < 14.90 || reqLat > 15.00 || reqLng < 120.80 || reqLng > 121.00) {
      reqLat = 14.945;
      reqLng = 120.895;
    }

    // 3. Compute distance vectors and filter responders within 1.2km radius
    const respondersWithDistance = eligibleResponders
      .map((responder) => {
        // Fallback to CDRRMO HQ coordinates if responder location is null (crucial for seeded/new responders)
        let resLat = responder.lastLatitude !== null ? Number(responder.lastLatitude) : 14.9516;
        let resLng = responder.lastLongitude !== null ? Number(responder.lastLongitude) : 120.9011;

        // Mock coordinates in Baliwag if responder is outside the city (for developer off-site testing convenience)
        if (resLat < 14.90 || resLat > 15.00 || resLng < 120.80 || resLng > 121.00) {
          resLat = 14.954;
          resLng = 120.902;
        }

        // Force seeded responder@disastrace.com to be within 1.2km of request coordinates (~250m) for off-site developer testing
        if (responder.email === "responder@disastrace.com") {
          resLat = reqLat + 0.0015;
          resLng = reqLng + 0.0015;
        }

        const distanceKm = calculateHaversineDistance(
          reqLat,
          reqLng,
          resLat,
          resLng
        );
        return { responder, distanceKm };
      })
      .filter((item) => item.distanceKm <= 1.2) // Only within 1.2km radius
      .sort((a, b) => a.distanceKm - b.distanceKm); // Sort nearest first

    if (respondersWithDistance.length === 0) {
      console.log(`No eligible responders within 1.2km found for request ${requestId}`);
      return null;
    }

    const assignedItem = respondersWithDistance[0];
    const assignedResponder = assignedItem.responder;

    // 4. Update the verification request to VERIFIED
    await db.update(verificationRequests)
      .set({ status: "VERIFIED", updatedAt: new Date() })
      .where(eq(verificationRequests.id, requestId));

    // Fetch system settings to resolve dynamic dispatch offer timeout duration
    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
    });
    const offerDuration = settings?.dispatchOfferTimeoutSeconds ?? 30;
    const offerExpiresAt = new Date(Date.now() + offerDuration * 1000);

    // 5. Create the incident record with the initial dispatch offer
    const [newIncident] = await db.insert(incidents).values({
      id: crypto.randomUUID(),
      requestId,
      responderId: null, // Null during negotiation offer
      currentOfferResponderId: assignedResponder.id,
      status: "DISPATCHED",
      dispatchMethod: "AUTO_1KM",
      assignedAmbulance: "Ambulance Unit " + Math.floor(Math.random() * 5 + 1),
      etaMinutes: Math.max(2, Math.round(assignedItem.distanceKm * 5)), // Approximate ETA based on distance
      offerExpiresAt,
      dispatchOfferDurationSeconds: offerDuration,
      skippedResponderIds: [],
    }).returning();

    // 6. Set responder's dutyStatus to ACTIVE_DISPATCH (reserved for countdown)
    await db.update(users)
      .set({ dutyStatus: "ACTIVE_DISPATCH" })
      .where(eq(users.id, assignedResponder.id));

    return newIncident;
  } catch (error) {
    console.error("Error in autoDispatchIncident:", error);
    return null;
  }
}

export async function cascadeIncident(incidentId: string, timedOutResponderId: string | null) {
  try {
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      console.error(`Incident ${incidentId} not found during cascade.`);
      return;
    }

    const request = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, incident.requestId),
    });

    if (!request) {
      console.error(`Verification request for incident ${incidentId} not found during cascade.`);
      return;
    }

    // Mark the timed-out/rejecting responder as skipped
    const currentSkipped = incident.skippedResponderIds || [];
    const updatedSkipped = timedOutResponderId 
      ? (currentSkipped.includes(timedOutResponderId) ? currentSkipped : [...currentSkipped, timedOutResponderId])
      : currentSkipped;

    if (timedOutResponderId) {
      // Reset timed-out responder back to ON_DUTY so they can take other runs
      await db.update(users)
        .set({ dutyStatus: "ON_DUTY" })
        .where(eq(users.id, timedOutResponderId));
    }

    // Fetch clocked-in responders who are not in the skipped list
    const eligibleResponders = await db.query.users.findMany({
      where: and(
        eq(users.role, "ambulance_responder"),
        eq(users.status, "ACTIVE"),
        eq(users.dutyStatus, "ON_DUTY"),
        eq(users.email, "responder@disastrace.com") // Temp restriction to only allow specific responder
      ),
    });

    const filteredResponders = eligibleResponders.filter((r) => !updatedSkipped.includes(r.id));

    let reqLat = request.latitude;
    let reqLng = request.longitude;

    // Mock request coordinates in Baliwag if outside (for developer off-site testing convenience)
    if (reqLat < 14.90 || reqLat > 15.00 || reqLng < 120.80 || reqLng > 121.00) {
      reqLat = 14.945;
      reqLng = 120.895;
    }

    // Compute distances
    const sortedResponders = filteredResponders
      .map((responder) => {
        // Fallback to CDRRMO HQ coordinates if responder location is null
        let resLat = responder.lastLatitude !== null ? Number(responder.lastLatitude) : 14.9516;
        let resLng = responder.lastLongitude !== null ? Number(responder.lastLongitude) : 120.9011;

        // Mock coordinates in Baliwag if responder is outside the city
        if (resLat < 14.90 || resLat > 15.00 || resLng < 120.80 || resLng > 121.00) {
          resLat = 14.954;
          resLng = 120.902;
        }

        // Force seeded responder@disastrace.com to be within 1.2km of request coordinates (~250m) for off-site developer testing
        if (responder.email === "responder@disastrace.com") {
          resLat = reqLat + 0.0015;
          resLng = reqLng + 0.0015;
        }

        const distanceKm = calculateHaversineDistance(
          reqLat,
          reqLng,
          resLat,
          resLng
        );
        return { responder, distanceKm };
      })
      .filter((item) => item.distanceKm <= 1.2)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (sortedResponders.length > 0) {
      // Option A: Cascade offer to the next nearest unit
      const nextItem = sortedResponders[0];
      const nextResponder = nextItem.responder;

      const nextOfferDuration = incident.dispatchOfferDurationSeconds || 30;
      const nextOfferExpiresAt = new Date(Date.now() + nextOfferDuration * 1000);

      await db.update(incidents)
        .set({
          currentOfferResponderId: nextResponder.id,
          offerExpiresAt: nextOfferExpiresAt,
          skippedResponderIds: updatedSkipped,
          etaMinutes: Math.max(2, Math.round(nextItem.distanceKm * 5)),
        })
        .where(eq(incidents.id, incident.id));

      // Reserve new responder
      await db.update(users)
        .set({ dutyStatus: "ACTIVE_DISPATCH" })
        .where(eq(users.id, nextResponder.id));

      console.log(`Cascade successfully completed. Transmitted offer to responder ${nextResponder.fullName}.`);
    } else {
      // No more responders left in range: Revert immediately back to PENDING triage!
      console.log(`Cascade exhausted: No remaining available responders within 1.2km for incident ${incident.id}. Reverting verification request to PENDING immediately.`);
      
      // 1. Delete the incident
      await db.delete(incidents).where(eq(incidents.id, incident.id));

      // 2. Revert request status back to PENDING so it re-enters the PACC triage queue
      await db.update(verificationRequests)
        .set({
          status: "PENDING",
          updatedAt: new Date()
        })
        .where(eq(verificationRequests.id, incident.requestId));
    }
  } catch (error) {
    console.error("Error in cascadeIncident:", error);
  }
}

export async function checkAndCascadeExpiredOffers() {
  try {
    const now = new Date();

    // 1. Find all active incidents in DISPATCHED state where the offer expired
    const expiredIncidents = await db.query.incidents.findMany({
      where: eq(incidents.status, "DISPATCHED"),
    });

    for (const incident of expiredIncidents) {
      if (!incident.offerExpiresAt || incident.offerExpiresAt > now) {
        continue;
      }

      // Found expired offer: Cascade to next responder
      console.log(`Cascade: Dispatch offer for incident ${incident.id} expired. Routing to next responder.`);
      await cascadeIncident(incident.id, incident.currentOfferResponderId);
    }
  } catch (error) {
    console.error("Error in checkAndCascadeExpiredOffers:", error);
  }
}

// Background scheduler method to automatically recycle expired manual overrides back to general triage queue (Option B)
export async function checkAndRecycleManualOverrides() {
  try {
    const now = new Date();

    const manualIncidents = await db.query.incidents.findMany({
      where: and(
        eq(incidents.status, "DISPATCHED"),
        eq(incidents.dispatchMethod, "PACC_MANUAL")
      ),
    });

    for (const incident of manualIncidents) {
      if (incident.offerExpiresAt && incident.offerExpiresAt <= now) {
        console.log(`Manual Override Timeout: Incident ${incident.id} was not force-dispatched by PACC dispatcher within 120 seconds. Recycling to general triage queue.`);

        // 1. Delete/Resolve incident entry since we revert to triage PENDING status
        await db.delete(incidents).where(eq(incidents.id, incident.id));

        // 2. Revert request status back to PENDING so it re-enters the PACC triage queue
        await db.update(verificationRequests)
          .set({
            status: "PENDING",
            updatedAt: new Date()
          })
          .where(eq(verificationRequests.id, incident.requestId));
      }
    }
  } catch (error) {
    console.error("Error in checkAndRecycleManualOverrides:", error);
  }
}
