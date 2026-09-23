import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MapSummarySchema } from "@/types/map";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { eq, inArray, sql } from "drizzle-orm";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const [[newIncidents], [ongoingIncidents], [completedIncidents], [pendingVerifications]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(incidents).where(eq(incidents.status, 'DISPATCHED')),
      db.select({ count: sql<number>`count(*)` }).from(incidents).where(inArray(incidents.status, ['EN_ROUTE', 'ARRIVED'])),
      db.select({ count: sql<number>`count(*)` }).from(incidents).where(eq(incidents.status, 'RESOLVED')),
      db.select({ count: sql<number>`count(*)` }).from(verificationRequests).where(eq(verificationRequests.status, 'PENDING')),
    ]);

    const summary = {
      new: Number(newIncidents?.count) || 0,
      ongoing: Number(ongoingIncidents?.count) || 0,
      completed: Number(completedIncidents?.count) || 0,
      standby: Number(pendingVerifications?.count) || 0,
    };

    const validatedData = MapSummarySchema.parse(summary);
    return NextResponse.json(validatedData);
  } catch (error) {
    console.error("Error fetching map summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

