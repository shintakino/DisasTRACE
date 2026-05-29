import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { faqs, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import crypto from "crypto";
import { z } from "zod";

const CreateFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  displayOrder: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const result = CreateFaqSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { question, answer, displayOrder } = result.data;
    const faqId = `faq-${crypto.randomUUID()}`;

    const [newFaq] = await db.insert(faqs).values({
      id: faqId,
      question,
      answer,
      displayOrder,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({
      success: true,
      message: "FAQ added successfully.",
      faq: newFaq,
    });
  } catch (error: any) {
    console.error("Error in POST /api/settings/support/faq:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
