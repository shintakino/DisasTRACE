import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspect() {
  console.log('--- Inspecting Database Dispatches ---');
  
  try {
    const { db } = await import('../db');
    const { verificationRequests } = await import('../db/schema/verification_requests');
    const { incidents } = await import('../db/schema/incidents');
    const { users } = await import('../db/schema/users');
    
    const dbReqs = await db.query.verificationRequests.findMany({
      orderBy: (verificationRequests, { desc }) => [desc(verificationRequests.createdAt)],
      limit: 5,
    });
    
    console.log('\n--- Recent Verification Requests ---');
    dbReqs.forEach((r) => {
      console.log(`ID: ${r.id} | ReqId: ${r.requestId} | Status: ${r.status} | Nature: ${r.nature} | Severity: ${r.severity} | Coordinates: (${r.latitude}, ${r.longitude})`);
    });

    const dbIncidents = await db.query.incidents.findMany({
      orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
      limit: 5,
    });

    console.log('\n--- Recent Incidents ---');
    dbIncidents.forEach((i) => {
      console.log(`ID: ${i.id} | RequestId: ${i.requestId} | OfferResponder: ${i.currentOfferResponderId} | Status: ${i.status} | Method: ${i.dispatchMethod} | Expires: ${i.offerExpiresAt}`);
    });

    const dbResponders = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, 'ambulance_responder'),
    });

    console.log('\n--- Ambulance Responders ---');
    dbResponders.forEach((resp) => {
      console.log(`Name: ${resp.fullName} | ID: ${resp.id} | Status: ${resp.dutyStatus} | Coordinates: (${resp.lastLatitude}, ${resp.lastLongitude})`);
    });

  } catch (error) {
    console.error('Error inspecting dispatches:', error);
  } finally {
    process.exit(0);
  }
}

inspect().catch(console.error);
