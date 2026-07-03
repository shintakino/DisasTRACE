import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspectReqs() {
  console.log('--- Inspecting Database Verification Requests ---');
  try {
    const { db } = await import('./db');
    
    const reqs = await db.query.verificationRequests.findMany({
      with: {
        resident: true
      }
    });
    
    reqs.forEach((r) => {
      console.log(`ReqId: ${r.requestId} | Resident: ${r.resident?.email} | Status: ${r.status} | Nature: ${r.nature} | Severity: ${r.severity}`);
    });
  } catch (error) {
    console.error('Inspection failed:', error);
  } finally {
    process.exit(0);
  }
}

inspectReqs().catch(console.error);
