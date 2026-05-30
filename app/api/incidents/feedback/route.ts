import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbacks } from "@/db/schema/feedbacks";
import { auditLogs } from "@/db/schema/audit_logs";
import { createClient } from "@/lib/supabase-server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const FeedbackSchema = z.object({
  requestId: z.string().uuid().optional(),
  incidentId: z.string().uuid().optional(),
  reportId: z.string().optional(),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

// POST /api/incidents/feedback — Create or update feedback (upsert)
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
    const entityId = incidentId || requestId;

    if (!entityId) {
      return NextResponse.json({ error: "Either incidentId or requestId is required." }, { status: 400 });
    }

    // Check if feedback already exists for this user + incident
    const existing = await db.query.feedbacks.findFirst({
      where: and(
        eq(feedbacks.userId, user.id),
        eq(feedbacks.incidentId, entityId),
      ),
    });

    if (existing) {
      // UPDATE existing feedback
      const [updated] = await db.update(feedbacks)
        .set({
          rating,
          comment: feedback || null,
          reportId: reportId || existing.reportId,
          updatedAt: new Date(),
        })
        .where(eq(feedbacks.id, existing.id))
        .returning();

      // Log the edit in audit logs
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.id,
        action: "EDIT_FEEDBACK",
        entityType: "INCIDENT",
        entityId,
        details: {
          feedbackId: existing.id,
          previousRating: existing.rating,
          newRating: rating,
          feedback: feedback || 'None provided.',
          reportId: reportId || null,
        },
      });

      return NextResponse.json({
        success: true,
        updated: true,
        message: "Your feedback has been updated. Thank you!",
        feedback: updated,
      });
    }

    // CREATE new feedback
    const feedbackId = crypto.randomUUID();
    const [newFeedback] = await db.insert(feedbacks).values({
      id: feedbackId,
      userId: user.id,
      incidentId: entityId,
      reportId: reportId || null,
      rating,
      comment: feedback || null,
    }).returning();

    // Log in audit logs
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: "SUBMIT_FEEDBACK",
      entityType: "INCIDENT",
      entityId,
      details: {
        feedbackId,
        rating,
        feedback: feedback || 'None provided.',
        reportId: reportId || null,
      },
    });

    return NextResponse.json({
      success: true,
      updated: false,
      message: "Feedback successfully recorded. Thank you for helping us improve our services!",
      feedback: newFeedback,
    });
  } catch (error) {
    console.error("Error in incident feedback controller:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/incidents/feedback?incidentId=xxx — Fetch existing feedback for a user + incident
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incidentId = req.nextUrl.searchParams.get("incidentId");
    if (!incidentId) {
      return NextResponse.json({ error: "incidentId query parameter is required." }, { status: 400 });
    }

    const existing = await db.query.feedbacks.findFirst({
      where: and(
        eq(feedbacks.userId, user.id),
        eq(feedbacks.incidentId, incidentId),
      ),
    });

    return NextResponse.json({
      success: true,
      feedback: existing || null,
    });
  } catch (error) {
    console.error("Error in GET /api/incidents/feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
