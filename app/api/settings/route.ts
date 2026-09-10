import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema/system_settings";
import { auditLogs } from "@/db/schema/audit_logs";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import crypto from "crypto";
import { DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT, MAX_GUEST_REPORTS_PER_PHONE_LIMIT } from "@/lib/guest-report-limit";

const SettingsUpdateSchema = z.object({
  dispatchOfferTimeoutSeconds: z.number().int().min(5, "Minimum timeout is 5 seconds").max(120, "Maximum timeout is 120 seconds").optional(),
  guestReportsPerPhoneLimit: z.number().int().min(1, "Guest report limit must be at least 1").max(MAX_GUEST_REPORTS_PER_PHONE_LIMIT, `Guest report limit cannot exceed ${MAX_GUEST_REPORTS_PER_PHONE_LIMIT}`).optional(),
  deduplicationRadiusMeters: z.number().int().min(50, "Deduplication radius must be at least 50 meters").max(1000, "Deduplication radius cannot exceed 1,000 meters").optional(),
}).refine((settings) => settings.dispatchOfferTimeoutSeconds !== undefined || settings.guestReportsPerPhoneLimit !== undefined || settings.deduplicationRadiusMeters !== undefined, {
  message: "At least one setting must be provided",
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the single configuration row
    let config = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
    });

    // Fallback if not seeded
    if (!config) {
      const [newConfig] = await db.insert(systemSettings).values({
        id: 'current',
        dispatchOfferTimeoutSeconds: 30,
        guestRequestsPerDay: 50,
        guestReportsPerPhoneLimit: DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT,
        deduplicationRadiusMeters: 250,
      }).returning();
      config = newConfig;
    }

    return NextResponse.json({
      success: true,
      settings: {
        dispatchOfferTimeoutSeconds: config.dispatchOfferTimeoutSeconds,
        guestReportsPerPhoneLimit: config.guestReportsPerPhoneLimit,
        deduplicationRadiusMeters: config.deduplicationRadiusMeters,
        updatedAt: config.updatedAt,
      }
    });
  } catch (error) {
    console.error("Error in GET /api/settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role in database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || (dbUser.role !== 'cdrrmo_super_admin' && dbUser.role !== 'pacc_admin')) {
      return NextResponse.json({ error: "Forbidden: Administrative access required" }, { status: 403 });
    }

    const body = await req.json();
    const includesGuestLimit = Object.prototype.hasOwnProperty.call(body, 'guestReportsPerPhoneLimit');
    const includesDeduplicationRadius = Object.prototype.hasOwnProperty.call(body, 'deduplicationRadiusMeters');
    if ((includesGuestLimit || includesDeduplicationRadius) && dbUser.role !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: "Forbidden: Only CDRRMO Super Admins can change the Guest Mode request limit" }, { status: 403 });
    }

    const result = SettingsUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const currentConfig = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
    });
    const dispatchOfferTimeoutSeconds = result.data.dispatchOfferTimeoutSeconds
      ?? currentConfig?.dispatchOfferTimeoutSeconds
      ?? 30;
    const guestReportsPerPhoneLimit = result.data.guestReportsPerPhoneLimit
      ?? currentConfig?.guestReportsPerPhoneLimit
      ?? DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT;
    const deduplicationRadiusMeters = result.data.deduplicationRadiusMeters ?? currentConfig?.deduplicationRadiusMeters ?? 250;

    // Upsert the system settings row
    const [updatedConfig] = await db.insert(systemSettings)
      .values({
        id: 'current',
        dispatchOfferTimeoutSeconds,
        guestRequestsPerDay: currentConfig?.guestRequestsPerDay ?? 50,
        guestReportsPerPhoneLimit,
        deduplicationRadiusMeters,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: {
          dispatchOfferTimeoutSeconds,
          guestRequestsPerDay: currentConfig?.guestRequestsPerDay ?? 50,
          guestReportsPerPhoneLimit,
          deduplicationRadiusMeters,
          updatedAt: new Date()
        }
      })
      .returning();

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Updated system settings: Dispatch Offer Timeout ${dispatchOfferTimeoutSeconds}s; Guest Mode phone limit ${guestReportsPerPhoneLimit}; Deduplication radius ${deduplicationRadiusMeters}m`,
      entityType: "SETTINGS",
      entityId: "current",
    });

    return NextResponse.json({
      success: true,
      message: "System settings updated successfully",
      settings: {
        dispatchOfferTimeoutSeconds: updatedConfig.dispatchOfferTimeoutSeconds,
        guestReportsPerPhoneLimit: updatedConfig.guestReportsPerPhoneLimit,
        deduplicationRadiusMeters: updatedConfig.deduplicationRadiusMeters,
        updatedAt: updatedConfig.updatedAt,
      }
    });
  } catch (error) {
    console.error("Error in POST /api/settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
