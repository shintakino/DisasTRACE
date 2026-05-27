import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

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

    const { latitude, longitude } = result.data;

    // Cache telemetry in the users table
    await db.update(users)
      .set({
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Responder telemetry successfully cached."
    });
  } catch (error) {
    console.error("Error in responder location cache API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
