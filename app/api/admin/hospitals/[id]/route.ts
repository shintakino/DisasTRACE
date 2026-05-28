import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { hospitals } from "@/db/schema/hospitals";
import { auditLogs } from "@/db/schema/audit_logs";
import { getUserRole } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const UpdateHospitalSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(255),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  caters: z.boolean(),
  phone: z.string().max(50).optional().nullable(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role is CDRRMO Super Admin
    const role = await getUserRole();
    if (role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden: CDRRMO Super Admin access required" }, { status: 403 });
    }

    // Check if hospital exists
    const existing = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    const body = await req.json();
    const result = UpdateHospitalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const validated = result.data;

    // Update hospital details in the database
    await db
      .update(hospitals)
      .set({
        name: validated.name,
        address: validated.address,
        lat: validated.lat,
        lng: validated.lng,
        caters: validated.caters,
        phone: validated.phone || null,
        updatedAt: new Date(),
      })
      .where(eq(hospitals.id, id));

    // Record audit log
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId: user.id,
      action: "HOSPITAL_UPDATED",
      entityType: "HOSPITAL",
      entityId: id,
      details: {
        before: { name: existing.name, lat: existing.lat, lng: existing.lng },
        after: { name: validated.name, lat: validated.lat, lng: validated.lng },
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Hospital updated successfully.",
    });
  } catch (error) {
    console.error("Error updating hospital:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user role is CDRRMO Super Admin
    const role = await getUserRole();
    if (role !== "cdrrmo_super_admin") {
      return NextResponse.json({ error: "Forbidden: CDRRMO Super Admin access required" }, { status: 403 });
    }

    // Check if hospital exists
    const existing = await db.query.hospitals.findFirst({
      where: eq(hospitals.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    // Delete the hospital
    await db.delete(hospitals).where(eq(hospitals.id, id));

    // Record audit log
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId: user.id,
      action: "HOSPITAL_DELETED",
      entityType: "HOSPITAL",
      entityId: id,
      details: { name: existing.name },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Hospital deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting hospital:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
