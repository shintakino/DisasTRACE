import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { hospitals } from "@/db/schema/hospitals";
import { auditLogs } from "@/db/schema/audit_logs";
import { getUserRole } from "@/lib/auth";
import { z } from "zod";

const CreateHospitalSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1).max(255),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  caters: z.boolean().default(true),
  phone: z.string().max(50).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const result = CreateHospitalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 });
    }

    const validated = result.data;
    const newId = `hosp-${Date.now()}`;

    // Insert into database
    await db.insert(hospitals).values({
      id: newId,
      name: validated.name,
      address: validated.address,
      lat: validated.lat,
      lng: validated.lng,
      caters: validated.caters,
      phone: validated.phone || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Record audit log
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId: user.id,
      action: "HOSPITAL_CREATED",
      entityType: "HOSPITAL",
      entityId: newId,
      details: { name: validated.name, address: validated.address, lat: validated.lat, lng: validated.lng },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Hospital created successfully.",
      hospital: { id: newId, ...validated }
    });
  } catch (error) {
    console.error("Error creating hospital:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
