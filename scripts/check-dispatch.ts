import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../db";
import { incidents } from "../db/schema/incidents";
import { users } from "../db/schema/users";
import { inArray, eq } from "drizzle-orm";

async function checkDispatches() {
  try {
    console.log("Checking active incidents in the database...");
    
    // Fetch active incidents
    const activeIncidents = await db.query.incidents.findMany({
      where: inArray(incidents.status, ["DISPATCHED", "EN_ROUTE", "ARRIVED", "ON_SCENE", "TO_HOSPITAL"])
    });

    if (activeIncidents.length === 0) {
      console.log("\n✅ No active dispatches found.");
    } else {
      console.log(`\n🚨 Found ${activeIncidents.length} active incident(s):`);
      activeIncidents.forEach((inc, i) => {
        console.log(`\n--- Incident ${i + 1} ---`);
        console.log(`ID: ${inc.id}`);
        console.log(`Status: ${inc.status}`);
        console.log(`Dispatch Method: ${inc.dispatchMethod}`);
        console.log(`Current Offer Responder ID: ${inc.currentOfferResponderId || 'None'}`);
        console.log(`Assigned Responder: ${inc.responder ? inc.responder.fullName : 'None'}`);
        console.log(`Assigned Ambulance: ${inc.assignedAmbulance || 'None'}`);
        console.log(`Offer Expires At: ${inc.offerExpiresAt ? new Date(inc.offerExpiresAt).toLocaleString() : 'N/A'}`);
      });
    }

    // Check for responders in ACTIVE_DISPATCH
    console.log("\nChecking responders stuck in ACTIVE_DISPATCH...");
    const activeDispatchResponders = await db.query.users.findMany({
      where: eq(users.dutyStatus, "ACTIVE_DISPATCH"),
      columns: {
        id: true,
        fullName: true,
        email: true,
        dutyStatus: true
      }
    });

    if (activeDispatchResponders.length === 0) {
      console.log("✅ No responders currently in ACTIVE_DISPATCH state.");
    } else {
      console.log(`\n⚠️ Found ${activeDispatchResponders.length} responder(s) in ACTIVE_DISPATCH:`);
      activeDispatchResponders.forEach((r) => {
        console.log(`- ${r.fullName} (${r.email})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error querying database:", error);
    process.exit(1);
  }
}

checkDispatches();
