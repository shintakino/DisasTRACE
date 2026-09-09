import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema/system_settings";
import { auditLogs } from "@/db/schema/audit_logs";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import crypto from "crypto";

const SettingsUpdateSchema = z.object({
  dispatchOfferTimeoutSeconds: z.number().int().min(5, "Minimum timeout is 5 seconds").max(120, "Maximum timeout is 120 seconds").optional(),
  guestRequestsPerDay: z.number().int().min(1, "Guest request limit must be at least 1").max(10000, "Guest request limit cannot exceed 10,000").optional(),
  deduplicationRadiusMeters: z.number().int().min(50, "Deduplication radius must be at least 50 meters").max(1000, "Deduplication radius cannot exceed 1,000 meters").optional(),
}).refine((settings) => settings.dispatchOfferTimeoutSeconds !== undefined || settings.guestRequestsPerDay !== undefined || settings.deduplicationRadiusMeters !== undefined, {
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
        deduplicationRadiusMeters: 250,
      }).returning();
      config = newConfig;
    }

    return NextResponse.json({
      success: true,
      settings: {
        dispatchOfferTimeoutSeconds: config.dispatchOfferTimeoutSeconds,
        guestRequestsPerDay: config.guestRequestsPerDay,
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
    const includesGuestLimit = Object.prototype.hasOwnProperty.call(body, 'guestRequestsPerDay');
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
    const guestRequestsPerDay = result.data.guestRequestsPerDay
      ?? currentConfig?.guestRequestsPerDay
      ?? 50;
    const deduplicationRadiusMeters = result.data.deduplicationRadiusMeters ?? currentConfig?.deduplicationRadiusMeters ?? 250;

    // Upsert the system settings row
    const [updatedConfig] = await db.insert(systemSettings)
      .values({
        id: 'current',
        dispatchOfferTimeoutSeconds,
        guestRequestsPerDay,
        deduplicationRadiusMeters,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: {
          dispatchOfferTimeoutSeconds,
          guestRequestsPerDay,
          deduplicationRadiusMeters,
          updatedAt: new Date()
        }
      })
      .returning();

    // Insert audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.id,
      action: `Updated system settings: Dispatch Offer Timeout ${dispatchOfferTimeoutSeconds}s; Guest Mode limit ${guestRequestsPerDay}/day; Deduplication radius ${deduplicationRadiusMeters}m`,
      entityType: "SETTINGS",
      entityId: "current",
    });

    return NextResponse.json({
      success: true,
      message: "System settings updated successfully",
      settings: {
        dispatchOfferTimeoutSeconds: updatedConfig.dispatchOfferTimeoutSeconds,
        guestRequestsPerDay: updatedConfig.guestRequestsPerDay,
        deduplicationRadiusMeters: updatedConfig.deduplicationRadiusMeters,
        updatedAt: updatedConfig.updatedAt,
      }
    });
  } catch (error) {
    console.error("Error in POST /api/settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
