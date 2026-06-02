import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { parentRequestId } = body;

    if (!parentRequestId) {
      return NextResponse.json(
        { error: "Parent request ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role in the users table is pacc_admin or cdrrmo_super_admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.role !== "pacc_admin" && dbUser.role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate that target request exists
    const targetRequest = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id),
    });

    if (!targetRequest) {
      return NextResponse.json(
        { error: "Target verification request not found" },
        { status: 404 }
      );
    }

    if (targetRequest.nature !== "EMERGENCY") {
      return NextResponse.json(
        { error: "Only emergency reports can be merged as duplicates." },
        { status: 400 }
      );
    }

    // Validate that parent request exists
    const parentRequest = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, parentRequestId),
    });

    if (!parentRequest) {
      return NextResponse.json(
        { error: "Parent verification request not found" },
        { status: 404 }
      );
    }

    if (parentRequest.nature !== "EMERGENCY") {
      return NextResponse.json(
        { error: "Reports can only be merged into active verified emergencies." },
        { status: 400 }
      );
    }

    // Update the verification request
    await db.update(verificationRequests)
      .set({
        status: "DUPLICATE",
        parentRequestId,
        updatedAt: new Date(),
      })
      .where(eq(verificationRequests.id, id));

    return NextResponse.json({
      success: true,
      message: "Incident report successfully merged as duplicate.",
    });
  } catch (error: any) {
    console.error("Error in POST /api/verification/[id]/merge:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
