import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

const DutyStatusSchema = z.object({
  dutyStatus: z.enum(['OFF_DUTY', 'ON_DUTY']),
});

export async function PATCH(req: NextRequest) {
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

    // Protect ACTIVE_DISPATCH block: cannot clock out while handling an active incident
    if (dbUser.dutyStatus === 'ACTIVE_DISPATCH') {
      return NextResponse.json({ error: "Conflict: Cannot change duty status during an active dispatch run" }, { status: 409 });
    }

    const body = await req.json();
    const result = DutyStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { dutyStatus } = result.data;

    // Update duty status
    const [updatedUser] = await db.update(users)
      .set({ 
        dutyStatus,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      success: true,
      dutyStatus: updatedUser.dutyStatus,
      message: `Duty status updated to ${dutyStatus}.`,
    });
  } catch (error) {
    console.error("Error in duty-status controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
