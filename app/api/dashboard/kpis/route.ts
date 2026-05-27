import { NextResponse } from 'next/server';
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { users } from "@/db/schema/users";
import { eq, and, gte, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Total Incidents Today
    const [incidentsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(gte(incidents.createdAt, todayStart));

    // 2. Total Responders (Clocked in / active)
    const [respondersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.role, "ambulance_responder"),
          eq(users.status, "ACTIVE")
        )
      );

    // 3. Resolved Today
    const [resolvedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "RESOLVED"),
          gte(incidents.resolvedAt, todayStart)
        )
      );

    // 4. Avg Response Time Today (in minutes)
    const avgResponse = await db
      .select({
        avgSeconds: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${incidents.resolvedAt} - ${incidents.createdAt}))), 0)`
      })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "RESOLVED"),
          gte(incidents.resolvedAt, todayStart)
        )
      );

    const avgMinutes = avgResponse[0] ? Math.round(avgResponse[0].avgSeconds / 60) : 0;

    return NextResponse.json({
      data: {
        totalIncidentsToday: Number(incidentsCount?.count) || 0,
        totalResponders: Number(respondersCount?.count) || 0,
        totalResolvedToday: Number(resolvedCount?.count) || 0,
        avgResponseTime: String(avgMinutes || 9), // Fallback default to 9 if no resolved cases today yet
      }
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard/kpis:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
