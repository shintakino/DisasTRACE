import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function reset() {
  console.log('--- Starting Test Incident Reset ---');
  
  try {
    const { db } = await import('../db');
    const { users } = await import('../db/schema/users');
    const { verificationRequests } = await import('../db/schema/verification_requests');
    const { incidents } = await import('../db/schema/incidents');
    const { reports } = await import('../db/schema/reports');
    const { eq, inArray } = await import('drizzle-orm');

    // 1. Find the seeded resident user profile
    const residentEmail = 'user@disastrace.com';
    const resident = await db.query.users.findFirst({
      where: eq(users.email, residentEmail),
    });

    if (!resident) {
      console.log(`Could not find seeded resident user with email: ${residentEmail}`);
      return;
    }

    console.log(`Found resident user: ${resident.fullName} (${resident.id})`);

    // 2. Find all verification requests submitted by this resident
    const requests = await db.query.verificationRequests.findMany({
      where: eq(verificationRequests.residentId, resident.id),
    });

    if (requests.length === 0) {
      console.log('No verification requests found for this resident. Database is already clean.');
      
      // Still make sure to release any reserved responders back to ON_DUTY just in case
      await db.update(users)
        .set({ dutyStatus: 'ON_DUTY' })
        .where(eq(users.dutyStatus, 'ACTIVE_DISPATCH'));
      return;
    }

    const requestIds = requests.map(r => r.id);
    console.log(`Found ${requests.length} verification requests.`);

    // 3. Find and delete incidents referencing these verification requests
    const relatedIncidents = await db.query.incidents.findMany({
      where: inArray(incidents.requestId, requestIds),
    });

    if (relatedIncidents.length > 0) {
      const incidentIds = relatedIncidents.map(i => i.id);
      
      // Delete any dependent reports first
      console.log(`Deleting dependent reports for incident IDs: ${incidentIds.join(', ')}`);
      await db.delete(reports).where(inArray(reports.incidentId, incidentIds));
      
      console.log(`Found ${relatedIncidents.length} related incidents. Deleting...`);
      await db.delete(incidents).where(inArray(incidents.id, incidentIds));
    }

    // 4. Delete verification requests
    console.log('Deleting verification requests...');
    await db.delete(verificationRequests).where(inArray(verificationRequests.id, requestIds));

    // 5. Reset all responders back to ON_DUTY if they were reserved (ACTIVE_DISPATCH)
    console.log('Resetting reserved responders back to ON_DUTY...');
    await db.update(users)
      .set({ dutyStatus: 'ON_DUTY' })
      .where(eq(users.dutyStatus, 'ACTIVE_DISPATCH'));

    console.log('--- Incident and Verification Reset Successfully Completed ---');

  } catch (error) {
    console.error('Error executing reset script:', error);
  } finally {
    process.exit(0);
  }
}

reset().catch(console.error);
