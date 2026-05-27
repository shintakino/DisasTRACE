import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { systemSettings } from "@/db/schema/system_settings";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { responderId } = body;

    if (!responderId) {
      return NextResponse.json({ error: "Missing responderId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== "pacc_admin" && role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch the verification request
    const existingReq = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // 2. Fetch the selected responder to check details and generate deterministic vehicleId
    const responder = await db.query.users.findFirst({
      where: eq(users.id, responderId),
    });

    if (!responder) {
      return NextResponse.json({ error: "Responder not found" }, { status: 404 });
    }

    // Generate dynamic vehicle ID based on initials, or fall back to AMB-001
    const initials = responder.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
    const vehicleId = `AMB-${initials || "001"}`;

    // 3. Mark the verification request as VERIFIED
    await db.update(verificationRequests)
      .set({
        status: "VERIFIED",
        updatedAt: new Date()
      })
      .where(eq(verificationRequests.id, id));

    // 4. Create the new incident
    // Fetch system settings to resolve dynamic dispatch offer timeout duration
    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
    });
    const offerDuration = settings?.dispatchOfferTimeoutSeconds ?? 30;
    const offerExpiresAt = new Date(Date.now() + offerDuration * 1000);

    const [newIncident] = await db.insert(incidents).values({
      id: crypto.randomUUID(),
      requestId: id,
      responderId: null, // Null during negotiation offer
      status: "DISPATCHED",
      assignedAmbulance: vehicleId,
      etaMinutes: 8, // Default PACC Manual estimate
      currentOfferResponderId: responderId,
      skippedResponderIds: [],
      offerExpiresAt,
      dispatchMethod: "PACC_MANUAL",
      dispatchOfferDurationSeconds: offerDuration,
    }).returning();

    // 5. Reserve responder as ACTIVE_DISPATCH
    await db.update(users)
      .set({ dutyStatus: "ACTIVE_DISPATCH" })
      .where(eq(users.id, responderId));

    return NextResponse.json({
      success: true,
      message: `Successfully verified and manually dispatched incident to ${responder.fullName}`,
      incident: newIncident
    });
  } catch (error) {
    console.error("Error in POST /api/verification/[id]/dispatch:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
