import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { autoDispatchIncident } from "@/lib/dispatch-engine";
import { z } from "zod";

const TriageSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['VERIFY', 'REJECT']),
  nature: z.enum(['EMERGENCY', 'NON-EMERGENCY']).optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  rejectionReason: z.string().max(250).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const validatedStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';

    // Update request
    const [updatedReq] = await db.update(verificationRequests)
      .set({
        status: validatedStatus,
        nature: nature || existingReq.nature,
        severity: severity || existingReq.severity,
        locationDescription: rejectionReason ? `REJECTED: ${rejectionReason}. ${existingReq.locationDescription || ''}` : existingReq.locationDescription,
        updatedAt: new Date(),
      })
      .where(eq(verificationRequests.id, requestId))
      .returning();

    let incident = null;
    let autoDispatched = false;

    if (validatedStatus === 'VERIFIED') {
      incident = await autoDispatchIncident(
        requestId,
        existingReq.residentId,
        existingReq.latitude,
        existingReq.longitude
      );
      if (incident) {
        autoDispatched = true;
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      status: validatedStatus,
      request: updatedReq,
      incident,
      autoDispatched,
      message: `Incident request ${requestId} triaged as ${validatedStatus}`,
    });
  } catch (error) {
    console.error("Error in verification requests triage controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
