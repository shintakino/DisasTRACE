import { NextRequest, NextResponse } from "next/server";
import { VerificationStatusSchema } from "@/types/verification";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { incidents } from "@/db/schema/incidents";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { autoDispatchIncident } from "@/lib/dispatch-engine";
import crypto from "crypto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validatedStatus = VerificationStatusSchema.parse(status);

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== "pacc_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch the request to verify existence and check details
    const existingReq = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // 2. Update status in database
    const [updatedReq] = await db.update(verificationRequests)
      .set({ 
        status: validatedStatus,
        updatedAt: new Date()
      })
      .where(eq(verificationRequests.id, id))
      .returning();

    let incident = null;
    let autoDispatched = false;

    // 3. If verified, handle dispatch logic
    if (validatedStatus === "VERIFIED") {
      // Auto-dispatch only if it's an emergency
      if (existingReq.nature === "EMERGENCY") {
        incident = await autoDispatchIncident(
          id,
          existingReq.residentId,
          existingReq.latitude,
          existingReq.longitude
        );
        if (incident) {
          autoDispatched = true;
        }
      }

      // If non-emergency or if auto-dispatch found no responders:
      if (!incident) {
        const [manualIncident] = await db.insert(incidents).values({
          id: crypto.randomUUID(),
          requestId: id,
          responderId: null,
          currentOfferResponderId: null,
          status: "DISPATCHED",
          dispatchMethod: "PACC_MANUAL",
          assignedAmbulance: null,
          skippedResponderIds: [],
        }).returning();
        incident = manualIncident;
      }
    }

    // Fetch the updated request with resident relation to return fully mapped conformant object
    const finalReq = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id),
      with: {
        resident: true,
      }
    });

    let mappedReq = null;
    if (finalReq) {
      let peopleCount = 0;
      if (finalReq.peopleInvolved === '1-2 Persons') peopleCount = 2;
      else if (finalReq.peopleInvolved === '3-5 Persons') peopleCount = 4;
      else if (finalReq.peopleInvolved === '6+ Persons') peopleCount = 6;

      mappedReq = {
        id: finalReq.id,
        requestId: finalReq.requestId,
        status: finalReq.status,
        nature: finalReq.nature,
        type: finalReq.type,
        location: finalReq.locationDescription || "Baliwag City",
        peopleInvolved: peopleCount,
        imageUrl: finalReq.imageUrl || undefined,
        receivedAt: finalReq.createdAt.toISOString(),
        resident: {
          id: finalReq.resident.id,
          fullName: finalReq.resident.fullName,
          phone: finalReq.resident.phone || "No phone provided",
          address: finalReq.resident.address || "No address recorded",
          priorReports: 3,
          isVerified: finalReq.resident.verificationStatus === 'APPROVED',
        }
      };
    }

    return NextResponse.json({
      success: true,
      id,
      status: validatedStatus,
      request: mappedReq,
      incident,
      autoDispatched,
      message: `Verification request ${id} marked as ${validatedStatus}`,
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    return NextResponse.json(
      { error: "Invalid status or request data" },
      { status: 400 }
    );
  }
}
