import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { createClient } from "@/lib/supabase-server";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body; // Can be the UUID or requestId

    if (!id) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
    }

    // Update status to REJECTED or CANCELLED (depending on enum). 
    // Wait, the status enum for verificationRequests: 'PENDING' | 'VERIFIED' | 'REJECTED'. 
    // We can use 'REJECTED' for cancellation since that's what's supported in the schema.
    const [updated] = await db.update(verificationRequests)
      .set({ 
        status: 'REJECTED',
        // In a real system we might add a cancellation reason or separate status
      })
      .where(
        and(
          eq(verificationRequests.id, id),
          eq(verificationRequests.residentId, user.id), // Ensure they own it
          eq(verificationRequests.status, 'PENDING') // Can only cancel pending
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Request not found or cannot be cancelled' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: updated });

  } catch (error) {
    console.error('Error in PATCH /api/verification/cancel:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
