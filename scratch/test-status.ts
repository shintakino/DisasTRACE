import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq } from "drizzle-orm";

async function run() {
  try {
    console.log("Checking for a pending verification request...");
    const req = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.status, 'PENDING')
    });

    if (!req) {
      console.log("No pending verification request found to test.");
      return;
    }

    console.log(`Testing rejection update for request ID: ${req.id} (${req.requestId})...`);
    
    // Attempt dry-run update inside a transaction to prevent actual database modification
    await db.transaction(async (tx) => {
      const [updated] = await tx.update(verificationRequests)
        .set({ 
          status: 'REJECTED',
          updatedAt: new Date()
        })
        .where(eq(verificationRequests.id, req.id))
        .returning();
      
      console.log("Update query ran successfully! Updated record:", updated);
      
      // Rollback transaction to keep database clean
      tx.rollback();
    });
  } catch (err) {
    console.error("CRITICAL EXCEPTION ENCOUNTERED:");
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
