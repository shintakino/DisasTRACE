import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { cascadeIncident } from "@/lib/dispatch-engine";

const RespondSchema = z.object({
  incidentId: z.string().uuid(),
  action: z.enum(['ACCEPT', 'REJECT']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'ambulance_responder') {
      return NextResponse.json({ error: "Forbidden: Responder access required" }, { status: 403 });
    }

    const body = await req.json();
    const result = RespondSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { incidentId, action } = result.data;

    // Fetch the incident
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Ensure the offer was actually sent to this responder
    if (incident.currentOfferResponderId !== user.id) {
      return NextResponse.json({ error: "Conflict: This offer is no longer valid or belongs to another responder" }, { status: 409 });
    }

    if (action === 'ACCEPT') {
      // 1. Accept dispatch: Update incident state
      const [updatedIncident] = await db.update(incidents)
        .set({
          status: 'EN_ROUTE',
          responderId: user.id,
          currentOfferResponderId: null,
          offerExpiresAt: null,
        })
        .where(eq(incidents.id, incidentId))
        .returning();

      // 2. Set responder state to ACTIVE_DISPATCH
      await db.update(users)
        .set({ dutyStatus: 'ACTIVE_DISPATCH' })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        incident: updatedIncident,
        message: "Dispatch offer accepted.",
      });
    } else {
      // REJECT: Decline offer, trigger cascade/reversion engine immediately
      console.log(`Responder ${dbUser.fullName} declined incident offer ${incidentId}. Cascading/reverting immediately...`);
      
      await cascadeIncident(incidentId, user.id);

      return NextResponse.json({
        success: true,
        message: "Dispatch offer declined and cascaded/reverted.",
      });
    }
  } catch (error) {
    console.error("Error in respond incident controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
