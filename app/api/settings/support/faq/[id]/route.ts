import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { faqs, users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import crypto from "crypto";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify Super Admin privileges
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin privileges required" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    // Check if the FAQ exists
    const existing = await db.query.faqs.findFirst({
      where: eq(faqs.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    // Delete FAQ from database
    await db.delete(faqs).where(eq(faqs.id, id));

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Deleted FAQ: "${existing.question}"`,
      entityType: "FAQ",
      entityId: id,
    });

    return NextResponse.json({
      success: true,
      message: "FAQ deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error in DELETE /api/settings/support/faq/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
