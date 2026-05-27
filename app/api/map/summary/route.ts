import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapSummarySchema } from "@/types/map";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq } from "drizzle-orm";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const allIncidents = await db.select({ status: incidents.status }).from(incidents);
    const pendingVerifications = await db
      .select({ id: verificationRequests.id })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, "PENDING"));

    const summary = {
      new: allIncidents.filter((i) => i.status === "DISPATCHED").length,
      ongoing: allIncidents.filter((i) => i.status === "EN_ROUTE" || i.status === "ARRIVED").length,
      completed: allIncidents.filter((i) => i.status === "RESOLVED").length,
      standby: pendingVerifications.length,
    };

    const validatedData = MapSummarySchema.parse(summary);
    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error fetching map summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

