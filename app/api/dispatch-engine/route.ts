import { NextResponse } from "next/server";
import { checkAndCascadeExpiredOffers, checkAndRecycleManualOverrides } from "@/lib/dispatch-engine";

export async function GET() {
  try {
    // 1. Run cascade check on expired active dispatch offers
    await checkAndCascadeExpiredOffers();
    
    // 2. Run recycling check on expired PACC manual overrides (Option B backup)
    await checkAndRecycleManualOverrides();

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
export const dynamic = 'force-dynamic';
