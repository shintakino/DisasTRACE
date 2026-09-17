import { NextRequest, NextResponse } from "next/server";
import { checkAndCascadeExpiredOffers, drainPendingAutomaticDispatches, healOrphanedActiveDispatches } from "@/lib/dispatch-engine";

export const dynamic = 'force-dynamic';

function isAuthorizedScheduler(request: NextRequest) {
  const secret = process.env.DISPATCH_SCHEDULER_SECRET;
  // Local development remains usable without provisioning Supabase Vault.
  if (!secret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedScheduler(request)) {
      return NextResponse.json({ error: "Unauthorized scheduler invocation" }, { status: 401 });
    }

    // 1. Run cascade check on expired active dispatch offers
    const expiry = await checkAndCascadeExpiredOffers();
    
    // 2. Run recycling check on expired PACC manual overrides (Option B backup)

    // 3. Self-heal orphaned ACTIVE_DISPATCH responders with no active incident
    const healing = await healOrphanedActiveDispatches();
    const pending = await drainPendingAutomaticDispatches(10);

    const processed = expiry.processed + healing.processed + pending.processed;
    const failed = expiry.failed + healing.failed + pending.failed;
    if (failed > 0) {
      return NextResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        processed,
        failed,
        details: { expiry, healing, pending },
        error: 'Background dispatch maintenance completed with failures and will retry on the next scheduler run.',
      }, { status: 503 });
    }

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      processed,
      failed,
      details: { expiry, healing, pending },
      message: "Background dispatch maintenance completed."
    });
  } catch (error) {
    console.error("Error in background dispatch scheduler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
