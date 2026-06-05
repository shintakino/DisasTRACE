import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supportSettings, faqs, users, auditLogs } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import crypto from "crypto";

const SupportSettingsUpdateSchema = z.object({
  phone: z.string().min(1, "Phone hotline is required"),
  email: z.string().email("Invalid email format"),
  address: z.string().min(1, "Headquarters address is required"),
  privacyPolicy: z.string().min(1, "Privacy policy text is required").optional(),
  privacyPolicyFull: z.string().min(1, "Full privacy policy text is required").optional(),
});

// GET /api/settings/support - Publicly accessible for mobile clients & web dashboard
export async function GET(req: NextRequest) {
  try {
    // 1. Fetch support details
    let details = await db.query.supportSettings.findFirst({
      where: eq(supportSettings.id, 'current'),
    });

    if (!details) {
      // Fallback seed inside route if database was not populated
      const [newDetails] = await db.insert(supportSettings).values({
        id: 'current',
        phone: '(044) 761-0000',
        email: 'cdrrmobaliwag@gmail.com',
        address: 'Baliwag Government Center, Brgy. Bagong Nayon, Baliwag City, Bulacan',
      }).returning();
      details = newDetails;
    }

    // 2. Fetch FAQs ordered by displayOrder asc
    const activeFaqs = await db.query.faqs.findMany({
      orderBy: [asc(faqs.displayOrder)],
    });

    return NextResponse.json({
      success: true,
      support: {
        phone: details.phone,
        email: details.email,
        address: details.address,
        privacyPolicy: details.privacyPolicy,
        privacyPolicyFull: details.privacyPolicyFull,
        updatedAt: details.updatedAt,
      },
      faqs: activeFaqs,
    });
  } catch (error) {
    console.error("Error in GET /api/settings/support:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/settings/support - Restrict to cdrrmo_super_admin
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorize: Verify caller is a CDRRMO Super Admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden: Super Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const result = SupportSettingsUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { phone, email, address, privacyPolicy, privacyPolicyFull } = result.data;

    // Build update payload dynamically
    const updatePayload: Record<string, any> = {
      phone,
      email,
      address,
      updatedAt: new Date(),
    };
    if (privacyPolicy !== undefined) {
      updatePayload.privacyPolicy = privacyPolicy;
    }
    if (privacyPolicyFull !== undefined) {
      updatePayload.privacyPolicyFull = privacyPolicyFull;
    }

    // Update settings in database
    const [updatedDetails] = await db.update(supportSettings)
      .set(updatePayload)
      .where(eq(supportSettings.id, 'current'))
      .returning();

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Updated support settings (Hotline: ${phone}, Email: ${email})`,
      entityType: "SETTINGS",
      entityId: "current",
    });

    return NextResponse.json({
      success: true,
      message: "Help & Support details updated successfully.",
      support: updatedDetails,
    });
  } catch (error: any) {
    console.error("Error in PUT /api/settings/support:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
