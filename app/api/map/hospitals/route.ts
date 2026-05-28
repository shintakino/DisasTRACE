import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { hospitals } from "@/db/schema/hospitals";
import { MapHospitalSchema } from "@/types/map";
import { z } from "zod";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Fetch actual hospitals from the database
    const dbHospitals = await db
      .select()
      .from(hospitals)
      .orderBy(asc(hospitals.name));

    // Map to API schema format
    const validatedData = z.array(MapHospitalSchema).parse(
      dbHospitals.map((h) => ({
        id: h.id,
        name: h.name,
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        caters: h.caters,
        phone: h.phone,
      }))
    );

    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error in GET /api/map/hospitals:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
