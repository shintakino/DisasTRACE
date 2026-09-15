import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { incidents } from "@/db/schema/incidents";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { autoDispatchIncident } from "@/lib/dispatch-engine";
import { z } from "zod";
import crypto from "crypto";
import { rejectVerificationRequest } from "@/lib/reject-verification-request";

const TriageSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['VERIFY', 'REJECT']),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  rejectionReason: z.string().max(250).optional(),
}).superRefine((value, context) => {
  if (value.action === 'REJECT' && !value.rejectionReason?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rejectionReason'],
      message: 'A clear rejection reason is required.',
    });
  }
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== "pacc_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = TriageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { requestId, action, nature, severity, rejectionReason } = result.data;

    // Fetch the request
    const existingReq = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, requestId),
    });

    if (!existingReq) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    let incident = null;
    let autoDispatched = false;
    let finalReq;

    if (action === 'VERIFY') {
      const finalNature = nature || existingReq.nature;

      // 1. Update fields (nature, severity) but do not mark status as VERIFIED yet to prevent real-time client race
      await db.update(verificationRequests)
        .set({
          nature: finalNature,
          severity: severity || existingReq.severity,
          updatedAt: new Date(),
        })
        .where(eq(verificationRequests.id, requestId));

      // 2. Call auto-dispatch engine only if it is an emergency and there is no
      // incident already associated with this request. This makes retries and
      // Guest Mode submissions idempotent.
      const existingIncident = await db.query.incidents.findFirst({
        where: eq(incidents.requestId, requestId),
      });
      if (finalNature === 'EMERGENCY' && !existingIncident) {
        incident = await autoDispatchIncident(
          requestId,
          existingReq.residentId,
          existingReq.latitude,
          existingReq.longitude
        );
      }

      if (incident) {
        autoDispatched = true;
      } else {
        // 3. Fallback/Non-emergency: Mark status as VERIFIED and create a manual dispatch incident
        await db.update(verificationRequests)
          .set({
            status: 'VERIFIED',
            updatedAt: new Date(),
          })
          .where(eq(verificationRequests.id, requestId));

        incident = existingIncident;
        if (!incident) {
          const [manualIncident] = await db.insert(incidents).values({
            id: crypto.randomUUID(),
            requestId: requestId,
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

      // Fetch the final request to return in response
      finalReq = await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.id, requestId),
      });
    } else {
      const rejection = await rejectVerificationRequest(requestId, rejectionReason);
      if (!rejection.success) {
        return NextResponse.json({ error: rejection.error }, { status: rejection.status });
      }
      finalReq = rejection.request;
    }

    return NextResponse.json({
      success: true,
      requestId,
      status: finalReq?.status || 'VERIFIED',
      request: finalReq,
      incident,
      autoDispatched,
      message: `Incident request ${requestId} triaged as ${finalReq?.status || 'VERIFIED'}`,
    });
  } catch (error) {
    console.error("Error in verification requests triage controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
