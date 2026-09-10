import { NextRequest, NextResponse } from "next/server";
import { checkAndCascadeExpiredOffers, checkAndRecycleManualOverrides, healOrphanedActiveDispatches } from "@/lib/dispatch-engine";

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
    await checkAndCascadeExpiredOffers();
    
    // 2. Run recycling check on expired PACC manual overrides (Option B backup)
    await checkAndRecycleManualOverrides();

    // 3. Self-heal orphaned ACTIVE_DISPATCH responders with no active incident
    await healOrphanedActiveDispatches();

    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      message: "Cascading dispatch check successfully executed."
    });
  } catch (error) {
    console.error("Error in background dispatch scheduler:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
