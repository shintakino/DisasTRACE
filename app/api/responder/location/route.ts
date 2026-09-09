import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { auditLogs } from "@/db/schema/audit_logs";
import { and, eq, gte, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { retryPendingAutomaticDispatches } from "@/lib/dispatch-engine";
import { assessResponderLocationMovement } from "@/lib/location-integrity";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isMockedLocation: z.boolean().optional().default(false),
});

async function recordLocationIntegrityEvent(input: {
  userId: string;
  action: 'RESPONDER_MOCK_LOCATION_REJECTED' | 'RESPONDER_IMPLAUSIBLE_LOCATION_HELD';
  details: Record<string, number | string>;
}) {
  // Limit repeat events so a bad location stream cannot flood the audit trail.
  const recent = await db.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.userId, input.userId),
      eq(auditLogs.action, input.action),
      gte(auditLogs.createdAt, new Date(Date.now() - 60_000)),
    ),
    columns: { id: true },
  });
  if (recent) return;

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    action: input.action,
    entityType: 'RESPONDER_LOCATION',
    entityId: input.userId,
    details: input.details,
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'ambulance_responder') {
      return NextResponse.json({ error: "Forbidden: Responder access required" }, { status: 403 });
    }

    const body = await req.json();
    const result = LocationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const { latitude, longitude, isMockedLocation } = result.data;

    if (isMockedLocation) {
      await recordLocationIntegrityEvent({
        userId: user.id,
        action: 'RESPONDER_MOCK_LOCATION_REJECTED',
        details: { source: 'android_mock_provider' },
      });
      return NextResponse.json({
        error: 'Mock location rejected',
        message: 'Turn off the device mock-location provider before sharing responder GPS.',
      }, { status: 422 });
    }

    const observedAt = new Date();
    const movement = assessResponderLocationMovement({
      previousLatitude: dbUser.lastLatitude,
      previousLongitude: dbUser.lastLongitude,
      previousUpdatedAt: dbUser.lastLocationUpdatedAt,
      latitude,
      longitude,
      observedAt,
    });
    if (!movement.plausible) {
      await recordLocationIntegrityEvent({
        userId: user.id,
        action: 'RESPONDER_IMPLAUSIBLE_LOCATION_HELD',
        details: {
          distanceMeters: Math.round(movement.distanceMeters),
          elapsedSeconds: Math.round(movement.elapsedSeconds),
        },
      });
      return NextResponse.json({
        success: false,
        held: true,
        message: 'This location update was held because it would require implausible travel. The last trusted responder position remains in use.',
      }, { status: 202 });
    }

    // Cache telemetry in the users table (including PostGIS geometry for spatial queries)
    await db.update(users)
      .set({
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdatedAt: observedAt,
        updatedAt: observedAt,
        locationGeom: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
      })
      .where(eq(users.id, user.id));

    if (dbUser.dutyStatus === 'ON_DUTY') {
      await retryPendingAutomaticDispatches();
    }

    return NextResponse.json({
      success: true,
      message: "Responder telemetry successfully cached."
    });
  } catch (error) {
    console.error("Error in responder location cache API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
