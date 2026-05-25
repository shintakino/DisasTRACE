import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { eq, ne, and, inArray, notInArray } from "drizzle-orm";

export async function autoDispatchIncident(requestId: string, residentId: string, latitude: number, longitude: number) {
  try {
    // 1. Find an available ambulance_responder
    // An available responder is one with role = 'ambulance_responder'
    // AND who is NOT currently assigned to an active incident (status in ['DISPATCHED', 'EN_ROUTE', 'ARRIVED'])
    // AND is ACTIVE
    
    const activeIncidents = await db.query.incidents.findMany({
      where: inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']),
      columns: {
        currentOfferResponderId: true,
      }
    });
    
    const busyResponderIds = activeIncidents
      .map(i => i.currentOfferResponderId)
      .filter(Boolean) as string[];

    // Fetch available responders
    let availableRespondersQuery = db.query.users.findMany({
      where: and(
        eq(users.role, 'ambulance_responder'),
        eq(users.status, 'ACTIVE')
      ),
      limit: 10
    });

    const potentialResponders = await availableRespondersQuery;
    const availableResponders = potentialResponders.filter(r => !busyResponderIds.includes(r.id));

    if (availableResponders.length === 0) {
      // No available responders found
      return null;
    }

    // Assign the first available responder (for now)
    const assignedResponder = availableResponders[0];

    // 2. Update the verification request to VERIFIED
    const [updatedReq] = await db.update(verificationRequests)
      .set({ status: 'VERIFIED' })
      .where(eq(verificationRequests.id, requestId))
      .returning();

    // 3. Create the incident record
    const [newIncident] = await db.insert(incidents).values({
      id: crypto.randomUUID(),
      requestId: updatedReq.id,
      responderId: null, // Null initially while offering, or we could set it to assignedResponder.id if it's direct dispatch
      currentOfferResponderId: assignedResponder.id,
      status: 'DISPATCHED',
      dispatchMethod: 'AUTO_1KM',
      assignedAmbulance: 'Ambulance Unit ' + Math.floor(Math.random() * 5 + 1), // Mock assigned ambulance unit
      etaMinutes: Math.floor(Math.random() * 10) + 5, // Mock ETA 5-15 mins
    }).returning();

    return newIncident;
  } catch (error) {
    console.error('Error in autoDispatchIncident:', error);
    return null;
  }
}
