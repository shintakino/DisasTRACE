import { NextRequest, NextResponse } from "next/server";
import { VerificationStatusSchema } from "@/types/verification";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body;

    const validatedStatus = VerificationStatusSchema.parse(status);

    // In a real app, update DB here.
    // If validatedStatus === "VERIFIED", also create a record in incidents table.

    return NextResponse.json({
      success: true,
      id,
      status: validatedStatus,
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
