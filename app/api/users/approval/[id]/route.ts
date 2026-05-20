import { NextRequest, NextResponse } from "next/server";
import { VerificationActionSchema } from "@/types/approval";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.app_metadata?.role !== 'cdrrmo_super_admin') {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }
  
  const { id } = await params;
  const body = await request.json();
  
  const result = VerificationActionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
  }

  const { status, reason } = result.data;

  try {
    const updateData: any = {
      verificationStatus: status,
      updatedAt: new Date(),
    };

    if (status === 'APPROVED') {
      updateData.status = 'ACTIVE';
    } else {
      updateData.rejectionReason = reason;
      // Optionally set status to DEACTIVATED or similar if rejected
      // For now, let's keep it as PENDING or whatever it was, 
      // but verificationStatus will be REJECTED.
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error("Error updating user verification:", error);
    return NextResponse.json({ error: "Failed to update user verification" }, { status: 500 });
  }
}
