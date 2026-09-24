import { NextResponse } from 'next/server';
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { eq, and, gte, lt, ne, sql } from "drizzle-orm";
import { verificationRequests } from "@/db/schema/verification_requests";
import { createClient } from "@/lib/supabase-server";
import { currentManilaDayBounds } from "@/lib/manila-time";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user.app_metadata?.role;
    if (role !== 'cdrrmo_super_admin' && role !== 'pacc_admin') {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: `Access denied. Dashboard requires Admin privileges.`,
        currentRole: role 
      }, { status: 403 });
    }

    const today = currentManilaDayBounds();

    const [[incidentsCount], [activeIncidentsCount], [pendingVerificationCount], [respondersCount], [resolvedCount], [rejectedCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(incidents).where(and(gte(incidents.createdAt, today.start), lt(incidents.createdAt, today.end))),
      db.select({ count: sql<number>`count(*)` }).from(incidents).where(ne(incidents.status, "RESOLVED")),
      db.select({ count: sql<number>`count(*)` }).from(verificationRequests).where(eq(verificationRequests.status, "PENDING")),
      db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "ambulance_responder"), eq(users.status, "ACTIVE"))),
      db.select({ count: sql<number>`count(*)` }).from(incidents).where(and(eq(incidents.status, "RESOLVED"), gte(incidents.resolvedAt, today.start), lt(incidents.resolvedAt, today.end))),
      db.select({ count: sql<number>`count(*)` }).from(verificationRequests).where(and(eq(verificationRequests.status, "REJECTED"), gte(verificationRequests.updatedAt, today.start), lt(verificationRequests.updatedAt, today.end))),
    ]);

    // Field-response time ends when the responder completes the field outcome,
    // not when later documentation is finally submitted.
    const avgResponse = await db
      .select({
        avgSeconds: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${incidents.fieldResponseCompletedAt} - ${incidents.createdAt}))), 0)`
      })
      .from(incidents)
      .where(
        and(
          sql`${incidents.fieldResponseCompletedAt} IS NOT NULL`,
          gte(incidents.fieldResponseCompletedAt, today.start),
          lt(incidents.fieldResponseCompletedAt, today.end),
        )
      );

    const avgMinutes = avgResponse[0] ? Math.round(avgResponse[0].avgSeconds / 60) : 0;

    return NextResponse.json({
      data: {
        totalIncidentsToday: Number(incidentsCount?.count) || 0,
        activeIncidents: Number(activeIncidentsCount?.count) || 0,
        pendingVerification: Number(pendingVerificationCount?.count) || 0,
        totalResponders: Number(respondersCount?.count) || 0,
        totalResolvedToday: Number(resolvedCount?.count) || 0,
        totalRejectedToday: Number(rejectedCount?.count) || 0,
        avgResponseTime: String(avgMinutes),
      }
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/kpis:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
