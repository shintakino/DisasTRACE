import { config } from "dotenv";
config({ path: ".env.local" });

import { healOrphanedActiveDispatches } from "../lib/dispatch-engine";

async function heal() {
  try {
    console.log("Running self-healing routine...");
    await healOrphanedActiveDispatches();
    console.log("Healing complete.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

heal();
