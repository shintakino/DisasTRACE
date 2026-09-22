import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";
import { systemSettings } from "@/db/schema/system_settings";
import { sendDispatchOfferExpiredPush, sendDispatchOfferPush } from "@/lib/push-notifications";
import { eq, and, or, sql, isNull, isNotNull, gte, lte } from "drizzle-orm";
import {
  AUTO_DISPATCH_RADIUS_KM,
  AUTO_DISPATCH_RADIUS_METERS,
  canCascadeDispatchOffer,
  DISPATCH_ACCEPTANCE_GRACE_MS,
  RESPONDER_HEARTBEAT_FRESHNESS_MS,
  shouldRetryAutomaticDispatch,
} from "@/lib/dispatch-policy";

type EligibleResponderBase = Pick<
  typeof users.$inferSelect,
  'id' | 'fullName' | 'email' | 'role' | 'status' | 'dutyStatus' | 'lastLatitude' | 'lastLongitude'
>;
type EligibleResponder = EligibleResponderBase | (EligibleResponderBase & { distanceMeters: number });

// Haversine formula to compute distance in kilometers
// Haversine formula to compute distance in kilometers
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export async function notifyPaccAndCdrrmo({
  title,
  body,
  type,
  metadata,
}: {
  title: string;
  body: string;
  type: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admins = await db.query.users.findMany({
      where: and(
        eq(users.status, "ACTIVE"),
        or(
          eq(users.role, "pacc_admin"),
          eq(users.role, "cdrrmo_super_admin")
        )
      ),
    });

    if (!admins || admins.length === 0) return;

    const notifValues = admins.map((admin) => ({
      id: crypto.randomUUID(),
      userId: admin.id,
      title,
      body,
      type,
      metadata,
      unread: true,
      createdAt: new Date(),
    }));

    await db.insert(notifications).values(notifValues);
  } catch (err) {
    console.error("[Notifications] Failed to notify PACC & CDRRMO:", err);
  }
}

export async function autoDispatchIncident(
  requestId: string,
  _residentId: string | null,
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

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";
    const responderFreshAfter = new Date(Date.now() - RESPONDER_HEARTBEAT_FRESHNESS_MS);

    let reqLat = latitude;
    let reqLng = longitude;

    if (isDevMode) {
      // Mock request coordinates in Baliwag if outside (for developer off-site testing convenience)
      if (reqLat < 14.90 || reqLat > 15.05 || reqLng < 120.80 || reqLng > 121.00) {
        reqLat = 14.945;
        reqLng = 120.895;
      }
    }

    // 2. Fetch all clocked-in responders using PostGIS or standard query (dev fallback)
    let eligibleResponders: EligibleResponder[];

    if (isDevMode) {
      eligibleResponders = await db.query.users.findMany({
        where: and(
          eq(users.role, "ambulance_responder"),
          eq(users.status, "ACTIVE"),
          eq(users.verificationStatus, "APPROVED"),
          eq(users.dutyStatus, "ON_DUTY"),
          gte(users.lastLocationUpdatedAt, responderFreshAfter),
        ),
      });
    } else {
      eligibleResponders = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          status: users.status,
          dutyStatus: users.dutyStatus,
          lastLatitude: users.lastLatitude,
          lastLongitude: users.lastLongitude,
          distanceMeters: sql<number>`ST_Distance(
            ${users.locationGeom}::geography,
            ST_SetSRID(ST_MakePoint(${reqLng}, ${reqLat}), 4326)::geography
          )`
        })
        .from(users)
        .where(
          and(
            eq(users.role, "ambulance_responder"),
            eq(users.status, "ACTIVE"),
            eq(users.verificationStatus, "APPROVED"),
            eq(users.dutyStatus, "ON_DUTY"),
            gte(users.lastLocationUpdatedAt, responderFreshAfter),
            sql`ST_DWithin(
              ${users.locationGeom}::geography,
              ST_SetSRID(ST_MakePoint(${reqLng}, ${reqLat}), 4326)::geography,
              ${AUTO_DISPATCH_RADIUS_METERS}
            )`
          )
        );
    }

    // 3. Compute distance vectors and enforce the same radius as PostGIS.
    const respondersWithDistance = eligibleResponders
      .map((item) => {
        if ('distanceMeters' in item) {
          return {
            responder: item,
            distanceKm: item.distanceMeters / 1000
          };
        }

        const responder = item;
        // Fallback to CDRRMO HQ coordinates if responder location is null (crucial for seeded/new responders)
        let resLat = responder.lastLatitude !== null ? Number(responder.lastLatitude) : 14.9516;
        let resLng = responder.lastLongitude !== null ? Number(responder.lastLongitude) : 120.9011;

        if (isDevMode) {
          // Deterministic offset to keep coordinates close but separate and sorted
          const offsetIndex = responder.email.includes("responder")
            ? (Number(responder.email.replace(/[^0-9]/g, '')) || 1)
            : (responder.id.charCodeAt(0) % 5 + 1);
          resLat = reqLat + 0.0015 * offsetIndex;
          resLng = reqLng + 0.0015 * offsetIndex;
        }

        const distanceKm = calculateHaversineDistance(
          reqLat,
          reqLng,
          resLat,
          resLng
        );
        return { responder, distanceKm };
      })
      .filter((item) => item.distanceKm <= AUTO_DISPATCH_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm); // Sort nearest first

    if (respondersWithDistance.length === 0) {
      console.log(`No eligible responders within ${AUTO_DISPATCH_RADIUS_KM}km found for request ${requestId}`);
      return null;
    }

    // Fetch system settings to resolve dynamic dispatch offer timeout duration
    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
    });
    const offerDuration = settings?.dispatchOfferTimeoutSeconds ?? 30;

    // 4. Atomically reserve a responder inside a database transaction to prevent
    //    concurrent dispatch race conditions (two simultaneous SOS requests selecting
    //    the same responder). Iterate through sorted candidates and attempt an atomic
    //    UPDATE ... WHERE dutyStatus = 'ON_DUTY' — only one concurrent transaction
    //    can succeed per responder row.
    const result = await db.transaction(async (tx) => {
      // Serialize dispatch against reporter cancellation and concurrent retry.
      // Both paths lock the same verification row before inspecting incidents.
      const [lockedRequest] = await tx
        .select({ id: verificationRequests.id, status: verificationRequests.status })
        .from(verificationRequests)
        .where(eq(verificationRequests.id, requestId))
        .limit(1)
        .for('update');
      if (!lockedRequest || lockedRequest.status !== 'PENDING') {
        const [existingIncident] = await tx.select().from(incidents).where(eq(incidents.requestId, requestId)).limit(1);
        return existingIncident ?? null;
      }
      const [existingIncident] = await tx.select().from(incidents).where(eq(incidents.requestId, requestId)).limit(1);
      if (existingIncident) return existingIncident;

      for (const candidateItem of respondersWithDistance) {
        const candidate = candidateItem.responder;

        // Atomic reservation: only succeeds if the responder is still ON_DUTY
        // at this exact moment. If another concurrent transaction already reserved
        // this responder (set them to ACTIVE_DISPATCH), zero rows are returned
        // and we move to the next candidate.
        const reservationConditions = [
          eq(users.id, candidate.id),
          eq(users.role, "ambulance_responder"),
          eq(users.status, "ACTIVE"),
          eq(users.verificationStatus, "APPROVED"),
          eq(users.dutyStatus, "ON_DUTY"),
        ];
        reservationConditions.push(gte(users.lastLocationUpdatedAt, responderFreshAfter));

        const reserved = await tx.update(users)
          .set({ dutyStatus: "ACTIVE_DISPATCH" })
          .where(and(...reservationConditions))
          .returning({ id: users.id });

        if (reserved.length === 0) {
          // Another concurrent dispatch already reserved this responder — skip to next
          console.log(`[AutoDispatch] Responder ${candidate.fullName} already reserved by concurrent dispatch. Trying next candidate...`);
          continue;
        }

        // Successfully reserved this responder atomically — proceed with dispatch
        const offerExpiresAt = new Date(Date.now() + offerDuration * 1000);

        // Generate deterministic vehicle ID
        const initials = candidate.fullName
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 3);
        const suffix = candidate.id.slice(-3).toUpperCase();
        const vehicleId = `AMB-${initials || "001"}-${suffix}`;

        // Create the incident record with the dispatch offer
        const [newIncident] = await tx.insert(incidents).values({
          id: crypto.randomUUID(),
          requestId,
          responderId: null, // Null during negotiation offer
          currentOfferResponderId: candidate.id,
          status: "DISPATCHED",
          dispatchMethod: "AUTO_1KM",
          assignedAmbulance: vehicleId,
          etaMinutes: Math.max(2, Math.round(candidateItem.distanceKm * 5)),
          offerExpiresAt,
          dispatchOfferDurationSeconds: offerDuration,
          skippedResponderIds: [],
        }).returning();

        // Update the verification request to VERIFIED
        await tx.update(verificationRequests)
          .set({ status: "VERIFIED", updatedAt: new Date() })
          .where(and(eq(verificationRequests.id, requestId), eq(verificationRequests.status, 'PENDING')));

        console.log(`[AutoDispatch] Successfully dispatched to ${candidate.fullName} for request ${requestId}`);
        return newIncident;
      }

      // All candidates were already reserved by concurrent dispatches
      console.log(`[AutoDispatch] All ${respondersWithDistance.length} candidate(s) within ${AUTO_DISPATCH_RADIUS_KM}km were already reserved for request ${requestId}`);
      return null;
    });

    if (result?.currentOfferResponderId) {
      await sendDispatchOfferPush({
        responderId: result.currentOfferResponderId,
        incidentId: result.id,
        offerExpiresAt: result.offerExpiresAt,
        incidentType: request.type,
      });
    }

    return result;
  } catch (error) {
    console.error("Error in autoDispatchIncident:", error);
    return null;
  }
}

// A report can arrive before a nearby responder has clocked in or published a
// fresh GPS point. Re-check the bounded pending queue whenever a responder
// becomes available so confirmed emergencies do not remain stranded at PACC.
// autoDispatchIncident owns the row locks and responder reservation, keeping
// concurrent heartbeats and submissions idempotent.
export async function retryPendingAutomaticDispatches(options: { throwOnError?: boolean } = {}) {
  try {
    const pendingEmergencies = await db.query.verificationRequests.findMany({
      where: and(
        eq(verificationRequests.status, 'PENDING'),
        eq(verificationRequests.nature, 'EMERGENCY'),
        eq(verificationRequests.triageClassification, 'HIGH_CONFIDENCE_EMERGENCY'),
      ),
      orderBy: (request, { asc }) => [
        sql`CASE ${request.severity}
          WHEN 'Critical' THEN 4
          WHEN 'High' THEN 3
          WHEN 'Medium' THEN 2
          ELSE 1
        END DESC`,
        asc(request.createdAt),
        asc(request.id),
      ],
      limit: 10,
    });

    for (const request of pendingEmergencies) {
      if (!shouldRetryAutomaticDispatch(request)) continue;

      const incident = await autoDispatchIncident(
        request.id,
        request.residentId,
        request.latitude,
        request.longitude,
      );
      if (incident) return incident;
    }

    return null;
  } catch (error) {
    // Telemetry and duty-status updates must still succeed when the best-effort
    // recovery query is temporarily unavailable.
    console.error('Error retrying pending automatic dispatches:', error);
    if (options.throwOnError) throw error;
    return null;
  }
}

export interface DispatchMaintenanceResult {
  processed: number;
  failed: number;
}

// The scheduler drains more than one report per invocation so simultaneous
// emergencies do not depend on an operator opening the PACC queue. Each inner
// dispatch remains transactionally responsible for responder reservation.
export async function drainPendingAutomaticDispatches(maxAssignments = 10): Promise<DispatchMaintenanceResult> {
  let processed = 0;
  try {
    for (let attempt = 0; attempt < maxAssignments; attempt += 1) {
      const incident = await retryPendingAutomaticDispatches({ throwOnError: true });
      if (!incident) break;
      processed += 1;
    }
    return { processed, failed: 0 };
  } catch (error) {
    console.error('Background pending-dispatch drain failed:', error);
    return { processed, failed: 1 };
  }
}

export async function cascadeIncident(incidentId: string, timedOutResponderId: string | null): Promise<boolean> {
  try {
    const incidentSnapshot = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incidentSnapshot) {
      console.error(`Incident ${incidentId} not found during cascade.`);
      return true;
    }

    if (!timedOutResponderId || !canCascadeDispatchOffer(incidentSnapshot, timedOutResponderId)) {
      console.log(`[Cascade] Offer ${incidentId} was already accepted, cleared, or reassigned.`);
      return true;
    }

    const request = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, incidentSnapshot.requestId),
    });

    if (!request) {
      console.error(`Verification request for incident ${incidentId} not found during cascade.`);
      return true;
    }

    // Mark the timed-out/rejecting responder as skipped
    const currentSkipped = incidentSnapshot.skippedResponderIds || [];
    const updatedSkipped = currentSkipped.includes(timedOutResponderId)
      ? currentSkipped
      : [...currentSkipped, timedOutResponderId];

    // Atomically claim the still-current offer for cascading. If acceptance won
    // the race, this update returns no row and must not reset or reassign the
    // responder.
    const [incident] = await db.update(incidents)
      .set({
        currentOfferResponderId: null,
        offerExpiresAt: null,
        skippedResponderIds: updatedSkipped,
      })
      .where(and(
        eq(incidents.id, incidentId),
        eq(incidents.status, 'DISPATCHED'),
        eq(incidents.currentOfferResponderId, timedOutResponderId),
        isNull(incidents.responderId),
      ))
      .returning();

    if (!incident) {
      console.log(`[Cascade] Offer ${incidentId} changed before cascade could claim it.`);
      return true;
    }

    // The old responder is no longer allowed to accept this incident. A push
    // makes that visible even if the app is backgrounded when the server's
    // deadline, rather than the local timer, releases the offer.
    void sendDispatchOfferExpiredPush({
      responderId: timedOutResponderId,
      incidentId: incident.id,
    }).catch((error) => console.error('[Cascade] Failed to send expired-offer push:', error));

    // The cascade owns the old offer now, so the responder can receive another.
    await db.update(users)
      .set({ dutyStatus: "ON_DUTY" })
      .where(eq(users.id, timedOutResponderId));

    // Handle PACC_MANUAL incidents separately:
    if (incident.dispatchMethod === "PACC_MANUAL") {
      console.log(`Manual Dispatch Offer Rejected/Timed out for incident ${incident.id}. Reverting to manual dispatch queue.`);

      let timedOutResponderName = "Assigned Responder";
      if (timedOutResponderId) {
        const rUser = await db.query.users.findFirst({
          where: eq(users.id, timedOutResponderId),
        });
        if (rUser) timedOutResponderName = rUser.fullName;
      }

      await notifyPaccAndCdrrmo({
        title: "Manual Dispatch Re-assignment Required",
        body: `Responder ${timedOutResponderName} did not accept the manual dispatch offer for Request #${request.requestId || request.id}. Manual re-assignment required.`,
        type: "manual_dispatch_rejected",
        metadata: {
          incidentId: incident.id,
          requestId: incident.requestId,
          responderId: timedOutResponderId,
          responderName: timedOutResponderName,
        },
      });

      // The timed-out manual offer no longer owns this responder. Let the
      // oldest automatic emergency waiting in the queue use the released unit.
      await retryPendingAutomaticDispatches();

      return true;
    }

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

    let reqLat = request.latitude;
    let reqLng = request.longitude;

    // Mock request coordinates in Baliwag if outside (for developer off-site testing convenience)
    if (isDevMode && (reqLat < 14.90 || reqLat > 15.05 || reqLng < 120.80 || reqLng > 121.00)) {
      reqLat = 14.945;
      reqLng = 120.895;
    }

    // Fetch clocked-in responders who are not in the skipped list using PostGIS or standard query (dev fallback)
    let eligibleResponders: EligibleResponder[];

    if (isDevMode) {
      eligibleResponders = await db.query.users.findMany({
        where: and(
          eq(users.role, "ambulance_responder"),
          eq(users.status, "ACTIVE"),
          eq(users.verificationStatus, "APPROVED"),
          eq(users.dutyStatus, "ON_DUTY"),
          gte(users.lastLocationUpdatedAt, new Date(Date.now() - RESPONDER_HEARTBEAT_FRESHNESS_MS)),
        ),
      });
    } else {
      eligibleResponders = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          status: users.status,
          dutyStatus: users.dutyStatus,
          lastLatitude: users.lastLatitude,
          lastLongitude: users.lastLongitude,
          distanceMeters: sql<number>`ST_Distance(
            ${users.locationGeom}::geography,
            ST_SetSRID(ST_MakePoint(${reqLng}, ${reqLat}), 4326)::geography
          )`
        })
        .from(users)
        .where(
          and(
            eq(users.role, "ambulance_responder"),
            eq(users.status, "ACTIVE"),
            eq(users.verificationStatus, "APPROVED"),
            eq(users.dutyStatus, "ON_DUTY"),
            gte(users.lastLocationUpdatedAt, new Date(Date.now() - RESPONDER_HEARTBEAT_FRESHNESS_MS)),
            sql`ST_DWithin(
              ${users.locationGeom}::geography,
              ST_SetSRID(ST_MakePoint(${reqLng}, ${reqLat}), 4326)::geography,
              ${AUTO_DISPATCH_RADIUS_METERS}
            )`
          )
        );
    }

    const filteredResponders = eligibleResponders.filter((r) => !updatedSkipped.includes(r.id));

    // Compute distances
    const sortedResponders = filteredResponders
      .map((item) => {
        if ('distanceMeters' in item) {
          return {
            responder: item,
            distanceKm: item.distanceMeters / 1000
          };
        }

        const responder = item;
        // Fallback to CDRRMO HQ coordinates if responder location is null
        let resLat = responder.lastLatitude !== null ? Number(responder.lastLatitude) : 14.9516;
        let resLng = responder.lastLongitude !== null ? Number(responder.lastLongitude) : 120.9011;

        if (isDevMode) {
          // Deterministic offset to keep coordinates close but separate and sorted
          const offsetIndex = responder.email.includes("responder")
            ? (Number(responder.email.replace(/[^0-9]/g, '')) || 1)
            : (responder.id.charCodeAt(0) % 5 + 1);
          resLat = reqLat + 0.0015 * offsetIndex;
          resLng = reqLng + 0.0015 * offsetIndex;
        }

        const distanceKm = calculateHaversineDistance(
          reqLat,
          reqLng,
          resLat,
          resLng
        );
        return { responder, distanceKm };
      })
      .filter((item) => item.distanceKm <= AUTO_DISPATCH_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (sortedResponders.length > 0) {
      // Iterate through candidates and atomically reserve the first available one
      const nextOfferDuration = incident.dispatchOfferDurationSeconds || 30;
      let cascaded = false;
      let pushTarget: { responderId: string; incidentId: string; offerExpiresAt: Date | null; incidentType: string } | null = null;

      for (const nextItem of sortedResponders) {
        const nextResponder = nextItem.responder;

        // Atomic reservation: only succeeds if the responder is still ON_DUTY
        const reserved = await db.update(users)
          .set({ dutyStatus: "ACTIVE_DISPATCH" })
          .where(
            and(
              eq(users.id, nextResponder.id),
              eq(users.role, "ambulance_responder"),
              eq(users.status, "ACTIVE"),
              eq(users.verificationStatus, "APPROVED"),
              eq(users.dutyStatus, "ON_DUTY"),
              gte(users.lastLocationUpdatedAt, new Date(Date.now() - RESPONDER_HEARTBEAT_FRESHNESS_MS))
            )
          )
          .returning({ id: users.id });

        if (reserved.length === 0) {
          // Responder already reserved by a concurrent dispatch — try next candidate
          console.log(`[Cascade] Responder ${nextResponder.fullName} already reserved. Trying next candidate...`);
          // Add to skipped so we don't retry them on the next cascade cycle
          if (!updatedSkipped.includes(nextResponder.id)) {
            updatedSkipped.push(nextResponder.id);
          }
          continue;
        }

        // Successfully reserved — update incident with new offer
        const nextOfferExpiresAt = new Date(Date.now() + nextOfferDuration * 1000);

        const [updatedOffer] = await db.update(incidents)
          .set({
            currentOfferResponderId: nextResponder.id,
            offerExpiresAt: nextOfferExpiresAt,
            skippedResponderIds: updatedSkipped,
            etaMinutes: Math.max(2, Math.round(nextItem.distanceKm * 5)),
          })
          .where(and(
            eq(incidents.id, incident.id),
            eq(incidents.status, 'DISPATCHED'),
            isNull(incidents.responderId),
            isNull(incidents.currentOfferResponderId),
            eq(incidents.dispatchMethod, 'AUTO_1KM'),
          ))
          .returning({ id: incidents.id, offerExpiresAt: incidents.offerExpiresAt });

        if (updatedOffer) {
          console.log(`[Cascade] Successfully transmitted offer to responder ${nextResponder.fullName}.`);
          cascaded = true;
          pushTarget = {
            responderId: nextResponder.id,
            incidentId: updatedOffer.id,
            offerExpiresAt: updatedOffer.offerExpiresAt,
            incidentType: request.type,
          };
        } else {
          // A PACC/manual action won after the expired offer was claimed. Do
          // not strand the responder reserved by this losing cascade.
          await db.update(users)
            .set({ dutyStatus: 'ON_DUTY' })
            .where(and(eq(users.id, nextResponder.id), eq(users.dutyStatus, 'ACTIVE_DISPATCH')));
          return true;
        }
        break;
      }

      if (pushTarget) {
        void sendDispatchOfferPush(pushTarget)
          .catch((error) => console.error('[Cascade] Failed to send next-offer push:', error));
      }

      if (!cascaded) {
        // Preserve the incident and skipped-responder record. Deleting this row
        // made the report disappear and allowed the same responder to be
        // offered repeatedly after a burst race.
        console.log(`[Cascade] All candidates within ${AUTO_DISPATCH_RADIUS_KM}km are reserved for incident ${incident.id}. Keeping it for PACC reassignment.`);
        await notifyPaccAndCdrrmo({
          title: 'Automatic Dispatch Re-assignment Required',
          body: `No available alternate responder for Request #${request.requestId || request.id}. PACC reassignment is required.`,
          type: 'dispatch_reassignment_required',
          metadata: { incidentId: incident.id, requestId: incident.requestId },
        });
        await retryPendingAutomaticDispatches();
      }
    } else {
      // The only available responder timed out and there is no alternate unit.
      // Keep this report as an unassigned PACC item instead of returning it to
      // automatic FIFO. That lets the next waiting report receive the released
      // responder, while PACC can explicitly reassign this report if needed.
      console.log(`Cascade exhausted: no alternate responder for incident ${incident.id}. Escalating it to PACC and advancing the automatic queue.`);
      await notifyPaccAndCdrrmo({
        title: 'Automatic Dispatch Re-assignment Required',
        body: `No alternate responder accepted Request #${request.requestId || request.id}. PACC reassignment is required.`,
        type: 'dispatch_reassignment_required',
        metadata: { incidentId: incident.id, requestId: incident.requestId },
      });
      await retryPendingAutomaticDispatches();
    }
    return true;
  } catch (error) {
    console.error("Error in cascadeIncident:", error);
    return false;
  }
}

// The offer deadline is a server-side contract. A responder must accept before
// this timestamp; the scheduler, not a paused mobile timer, releases it.
export async function checkAndCascadeExpiredOffers(): Promise<DispatchMaintenanceResult> {
  try {
    const now = new Date();

    // Keep each scheduler pass bounded and query only offers that can actually
    // expire. A following invocation continues the ordered backlog.
    const expiredIncidents = await db.query.incidents.findMany({
      where: and(
        eq(incidents.status, 'DISPATCHED'),
        isNotNull(incidents.currentOfferResponderId),
        isNotNull(incidents.offerExpiresAt),
        lte(incidents.offerExpiresAt, now),
      ),
      orderBy: (incident, { asc }) => [asc(incident.offerExpiresAt), asc(incident.id)],
      limit: 25,
    });

    let processed = 0;
    for (const incident of expiredIncidents) {
      if (!incident.offerExpiresAt) {
        continue;
      }

      // Allow a leeway grace period for the responder to submit the accept request
      const offerExpiresAtWithGrace = new Date(incident.offerExpiresAt.getTime() + DISPATCH_ACCEPTANCE_GRACE_MS);
      if (offerExpiresAtWithGrace > now) {
        continue;
      }

      // Found expired offer: Cascade to next responder
      console.log(`Cascade: Dispatch offer for incident ${incident.id} expired. Routing to next responder.`);
      const succeeded = await cascadeIncident(incident.id, incident.currentOfferResponderId);
      if (!succeeded) return { processed, failed: 1 };
      processed += 1;
    }
    return { processed, failed: 0 };
  } catch (error) {
    console.error("Error in checkAndCascadeExpiredOffers:", error);
    throw error;
  }
}

/** @deprecated All offer expiry must use the compare-and-swap cascade path. */
export async function checkAndRecycleManualOverrides() {
  await checkAndCascadeExpiredOffers();
}

// Self-healing: detect and fix responders stuck in ACTIVE_DISPATCH with no active incident.
// This can happen when a race condition, crash, or cascade error leaves a responder reserved
// but with no corresponding DISPATCHED incident pointing to them.
export async function healOrphanedActiveDispatches(): Promise<DispatchMaintenanceResult> {
  try {
    // 1. Find all responders currently in ACTIVE_DISPATCH
    const activeDispatchResponders = await db.query.users.findMany({
      where: and(
        eq(users.role, "ambulance_responder"),
        eq(users.dutyStatus, "ACTIVE_DISPATCH")
      ),
    });

    if (activeDispatchResponders.length === 0) return { processed: 0, failed: 0 };

    // 2. Find all DISPATCHED incidents that have an active offer or assigned responder
    const activeIncidents = await db.query.incidents.findMany({
      where: eq(incidents.status, "DISPATCHED"),
    });

    // Also check EN_ROUTE and ARRIVED — these are actively assigned
    const enRouteIncidents = await db.query.incidents.findMany({
      where: or(
        eq(incidents.status, "EN_ROUTE"),
        eq(incidents.status, "ARRIVED")
      ),
    });

    // Build a set of responder IDs that are legitimately busy
    const busyResponderIds = new Set<string>();
    for (const inc of activeIncidents) {
      if (inc.currentOfferResponderId) busyResponderIds.add(inc.currentOfferResponderId);
      if (inc.responderId) busyResponderIds.add(inc.responderId);
    }
    for (const inc of enRouteIncidents) {
      if (inc.responderId) busyResponderIds.add(inc.responderId);
    }

    // 3. Reset orphaned responders (ACTIVE_DISPATCH but no incident pointing to them)
    let processed = 0;
    for (const responder of activeDispatchResponders) {
      if (!busyResponderIds.has(responder.id)) {
        console.log(`[SelfHeal] Responder ${responder.fullName} (${responder.id}) is stuck in ACTIVE_DISPATCH with no active incident. Resetting to ON_DUTY.`);
        await db.update(users)
          .set({ dutyStatus: "ON_DUTY" })
          .where(eq(users.id, responder.id));
        processed += 1;
      }
    }
    return { processed, failed: 0 };
  } catch (error) {
    console.error("Error in healOrphanedActiveDispatches:", error);
    throw error;
  }
}
