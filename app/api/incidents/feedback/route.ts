import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit_logs";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

const FeedbackSchema = z.object({
  requestId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  reportId: z.string().optional(),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = FeedbackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { requestId, incidentId, reportId, rating, feedback } = result.data;

    // Log the feedback into our system audit logs for Super Admin visualization
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: "SUBMIT_FEEDBACK",
      entityType: "INCIDENT",
      entityId: incidentId || requestId || null,
      details: { rating, feedback: feedback || 'None provided.', reportId: reportId || null },
    });

    return NextResponse.json({
      success: true,
      message: "Feedback successfully recorded. Thank you for helping us improve our services!"
    });
  } catch (error) {
    console.error("Error in incident feedback controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
