import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { incidents } from "@/db/schema/incidents";
import { canBeDuplicateMergeParent, canBeMergedAsDuplicate } from "@/lib/verification-merge-policy";

const MergeRequestSchema = z.object({
  parentRequestId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = MergeRequestSchema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json(
        { error: "Parent request ID is required" },
        { status: 400 }
      );
    }
    const { parentRequestId } = payload.data;
    if (parentRequestId === id) {
      return NextResponse.json({ error: "A report cannot be merged into itself." }, { status: 400 });
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
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Lock both rows in a deterministic order. This keeps a PACC merge from
    // racing an acceptance/automatic-dispatch transaction for the same report.
    const mergeResult = await db.transaction(async (tx) => {
      const lockedRequests = await tx.select()
        .from(verificationRequests)
        .where(inArray(verificationRequests.id, [id, parentRequestId]))
        .orderBy(asc(verificationRequests.id))
        .for('update');
      const targetRequest = lockedRequests.find((request) => request.id === id);
      const parentRequest = lockedRequests.find((request) => request.id === parentRequestId);

      if (!targetRequest || !parentRequest) {
        return { status: 404, error: 'The selected report no longer exists.' };
      }

      const [targetIncident] = await tx.select({ id: incidents.id, status: incidents.status })
        .from(incidents)
        .where(eq(incidents.requestId, targetRequest.id))
        .limit(1);
      const [parentIncident] = await tx.select({ id: incidents.id, status: incidents.status })
        .from(incidents)
        .where(eq(incidents.requestId, parentRequest.id))
        .limit(1);

      if (!canBeMergedAsDuplicate({ ...targetRequest, incident: targetIncident ?? null })) {
        return { status: 409, error: 'Only an unassigned pending emergency report can be merged as a duplicate.' };
      }
      if (!canBeDuplicateMergeParent({ ...parentRequest, incident: parentIncident ?? null }, targetRequest)) {
        return { status: 409, error: 'Choose an active emergency report of the same type as the primary report.' };
      }

      const [merged] = await tx.update(verificationRequests)
        .set({ status: 'DUPLICATE', parentRequestId, updatedAt: new Date() })
        .where(and(
          eq(verificationRequests.id, id),
          eq(verificationRequests.status, 'PENDING'),
          isNull(verificationRequests.parentRequestId),
        ))
        .returning({ id: verificationRequests.id });
      return merged
        ? { status: 200 as const }
        : { status: 409, error: 'This report changed while it was being merged. Refresh the queue and try again.' };
    });

    if (mergeResult.status !== 200) {
      return NextResponse.json({ error: mergeResult.error }, { status: mergeResult.status });
    }

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
