import { NextRequest, NextResponse } from "next/server";
import { VerificationStatusSchema } from "@/types/verification";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { incidents } from "@/db/schema/incidents";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { autoDispatchIncident } from "@/lib/dispatch-engine";
import crypto from "crypto";
import { getReportLocation } from "@/lib/report-location";

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

    if (validatedStatus === "DUPLICATE") {
      return NextResponse.json(
        { error: "Use the merge action to mark a report as a duplicate." },
        { status: 400 }
      );
    }

    if (validatedStatus === "REJECTED") {
      const rejection = await db.transaction(async (tx) => {
        const [lockedRequest] = await tx
          .select()
          .from(verificationRequests)
          .where(eq(verificationRequests.id, id))
          .limit(1)
          .for('update');

        if (!lockedRequest) {
          return { success: false as const, status: 404, error: "Request not found" };
        }

        const [lockedIncident] = await tx
          .select()
          .from(incidents)
          .where(eq(incidents.requestId, id))
          .limit(1)
          .for('update');

        const hasActiveAssignment = Boolean(
          lockedIncident &&
          lockedIncident.status !== "RESOLVED" &&
          (lockedIncident.responderId || lockedIncident.currentOfferResponderId)
        );
        const canReject =
          lockedRequest.status === "PENDING" ||
          (lockedRequest.status === "VERIFIED" &&
            lockedIncident?.dispatchMethod === "PACC_MANUAL" &&
            !hasActiveAssignment);

        if (!canReject) {
          return {
            success: false as const,
            status: 409,
            error: "Only pending or unassigned PACC-handled reports can be rejected.",
          };
        }

        if (lockedIncident) {
          await tx.delete(incidents).where(eq(incidents.id, lockedIncident.id));
        }

        const [updatedRequest] = await tx
          .update(verificationRequests)
          .set({ status: "REJECTED", updatedAt: new Date() })
          .where(eq(verificationRequests.id, id))
          .returning();

        return { success: true as const, request: updatedRequest };
      });

      if (!rejection.success) {
        return NextResponse.json({ error: rejection.error }, { status: rejection.status });
      }

      return NextResponse.json({
        success: true,
        id,
        status: rejection.request.status,
        request: null,
        incident: null,
        autoDispatched: false,
        message: `Verification request ${id} marked as REJECTED`,
      });
    }

    // Fetch both records before changing state. Guest reports intentionally have
    // no resident row, so all decisions below are based on the request itself.
    const existingReq = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id),
    });

    if (!existingReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const existingIncident = await db.query.incidents.findFirst({
      where: eq(incidents.requestId, id),
    });

    if (existingReq.status === "REJECTED" || existingReq.status === "DUPLICATE") {
      return NextResponse.json(
        { error: `A ${existingReq.status.toLowerCase()} report cannot be verified.` },
        { status: 409 }
      );
    }

    let incident = existingIncident ?? null;
    let autoDispatched = false;

    // A verification action is valid for both registered and Guest Mode
    // requests. Reuse an existing incident so retries cannot create duplicates.
    if (validatedStatus === "VERIFIED") {
      if (!incident && existingReq.nature === "EMERGENCY") {
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

      // If this is non-emergency, or no responder was available, keep a
      // PACC_MANUAL placeholder so the report remains actionable and can be
      // dispatched later without requiring a merge.
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

      await db.update(verificationRequests)
        .set({ status: "VERIFIED", updatedAt: new Date() })
        .where(eq(verificationRequests.id, id));
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
      else {
        const parsedPeopleCount = Number.parseInt(finalReq.peopleInvolved, 10);
        if (Number.isFinite(parsedPeopleCount)) peopleCount = parsedPeopleCount;
      }

      mappedReq = {
        id: finalReq.id,
        requestId: finalReq.requestId,
        status: finalReq.status,
        nature: finalReq.nature,
        type: finalReq.type,
        location: getReportLocation(finalReq.locationDescription),
        peopleInvolved: peopleCount,
        imageUrl: finalReq.imageUrl || undefined,
        receivedAt: finalReq.createdAt.toISOString(),
        resident: {
          id: finalReq.resident?.id || 'guest',
          fullName: finalReq.resident?.fullName || 'Guest Reporter',
          phone: finalReq.resident?.phone || finalReq.contactNumber || "No phone provided",
          address: finalReq.resident?.address || "Guest report — no home address collected",
          priorReports: 3,
          isVerified: finalReq.resident?.verificationStatus === 'APPROVED',
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
