import { NextRequest, NextResponse } from "next/server";
import { ApprovalStatusSchema } from "@/types/approval";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // In a real app, we would check for pacc_admin or cdrrmo_super_admin role here
  
  const id = params.id;
  const body = await request.json();
  
  const result = ApprovalStatusSchema.safeParse(body.status);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const status = result.data;
  const reason = body.reason;

  console.log(`Updating applicant ${id} to status ${status}${reason ? ` with reason: ${reason}` : ""}`);

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({ success: true, id, status });
}
