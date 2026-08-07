import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { createClient } from "@/lib/supabase-server";
import { AnalyticsPeriodSchema, type AnalyticsPeriod } from "@/types/analytics";

const INCIDENT_TYPES = [
  { type: "Vehicular Collision", color: "#1E3A8A" },
  { type: "Medical Emergency", color: "#DC2626" },
  { type: "Structural Failure", color: "#D97706" },
  { type: "Fire Emergency", color: "#B91C1C" },
  { type: "Flood/Water", color: "#2563EB" },
  { type: "Unknown Cause", color: "#64748B" },
] as const;

interface TrendRow {
  label: string;
  count: number;
}

function getTrendQuery(period: AnalyticsPeriod) {
  if (period === "day") {
    return db
      .select({
        label: sql<string>`to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Mon DD')`,
        count: sql<number>`count(*)`,
      })
      .from(verificationRequests)
      .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= timezone('Asia/Manila', CURRENT_DATE) - interval '13 days'`)
      .groupBy(sql`to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Mon DD')`)
      .orderBy(sql`date_trunc('day', timezone('Asia/Manila', ${verificationRequests.createdAt}))`);
  }

  if (period === "week") {
    return db
      .select({
        label: sql<string>`concat('Week of ', to_char(date_trunc('week', timezone('Asia/Manila', ${verificationRequests.createdAt})), 'Mon DD'))`,
        count: sql<number>`count(*)`,
      })
      .from(verificationRequests)
      .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('week', timezone('Asia/Manila', now())) - interval '11 weeks'`)
      .groupBy(sql`concat('Week of ', to_char(date_trunc('week', timezone('Asia/Manila', ${verificationRequests.createdAt})), 'Mon DD'))`)
      .orderBy(sql`date_trunc('week', timezone('Asia/Manila', ${verificationRequests.createdAt}))`);
  }

  return db
    .select({
      label: sql<string>`to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Mon YYYY')`,
      count: sql<number>`count(*)`,
    })
    .from(verificationRequests)
    .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('month', timezone('Asia/Manila', now())) - interval '11 months'`)
    .groupBy(sql`to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Mon YYYY')`)
    .orderBy(sql`date_trunc('month', timezone('Asia/Manila', ${verificationRequests.createdAt}))`);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.app_metadata?.role !== "cdrrmo_super_admin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Analytics are available to CDRRMO Super Admins only." },
        { status: 403 }
      );
    }

    const parsedPeriod = AnalyticsPeriodSchema.safeParse(
      new URL(request.url).searchParams.get("period") ?? "month"
    );

    if (!parsedPeriod.success) {
      return NextResponse.json(
        { error: "Invalid request", message: "period must be day, week, or month." },
        { status: 400 }
      );
    }

    const period = parsedPeriod.data;

    // Run queries individually for debuggability
    let frequencyRows, trendRows, totalRows, verifiedRows, pendingRows, resolvedRows, responseTimeRows;

    try {
      frequencyRows = await db
        .select({ type: verificationRequests.type, count: sql<number>`count(*)` })
        .from(verificationRequests)
        .groupBy(verificationRequests.type);
    } catch (e) {
      console.error("[Analytics] frequencyRows query failed:", e);
      throw e;
    }

    try {
      trendRows = await getTrendQuery(period);
    } catch (e) {
      console.error("[Analytics] trendRows query failed:", e);
      throw e;
    }

    try {
      totalRows = await db.select({ count: sql<number>`count(*)` }).from(verificationRequests);
    } catch (e) {
      console.error("[Analytics] totalRows query failed:", e);
      throw e;
    }

    try {
      verifiedRows = await db.select({ count: sql<number>`count(*)` }).from(verificationRequests).where(eq(verificationRequests.status, "VERIFIED"));
    } catch (e) {
      console.error("[Analytics] verifiedRows query failed:", e);
      throw e;
    }

    try {
      pendingRows = await db.select({ count: sql<number>`count(*)` }).from(verificationRequests).where(eq(verificationRequests.status, "PENDING"));
    } catch (e) {
      console.error("[Analytics] pendingRows query failed:", e);
      throw e;
    }

    try {
      resolvedRows = await db.select({ count: sql<number>`count(*)` }).from(incidents).where(eq(incidents.status, "RESOLVED"));
    } catch (e) {
      console.error("[Analytics] resolvedRows query failed:", e);
      throw e;
    }

    try {
      responseTimeRows = await db
        .select({ avgResponseMinutes: sql<number>`coalesce(round(avg(extract(epoch from (${incidents.resolvedAt} - ${incidents.createdAt})) / 60)::numeric, 0), 0)` })
        .from(incidents)
        .where(eq(incidents.status, "RESOLVED"));
    } catch (e) {
      console.error("[Analytics] responseTimeRows query failed:", e);
      throw e;
    }

    const frequencies = INCIDENT_TYPES.map((incidentType) => ({
      ...incidentType,
      count: Number(frequencyRows.find((row) => row.type === incidentType.type)?.count ?? 0),
    })).sort((first, second) => second.count - first.count);

    const trends: TrendRow[] = trendRows.map((row) => ({
      label: row.label,
      count: Number(row.count),
    }));
    const totalReported = Number(totalRows[0]?.count ?? 0);
    const verified = Number(verifiedRows[0]?.count ?? 0);
    const pending = Number(pendingRows[0]?.count ?? 0);
    const resolved = Number(resolvedRows[0]?.count ?? 0);
    const avgResponseMinutes = Number(responseTimeRows[0]?.avgResponseMinutes ?? 0);
    const topFrequency = frequencies[0];
    const peakTrend = trends.reduce<TrendRow | undefined>(
      (peak, current) => (!peak || current.count > peak.count ? current : peak),
      undefined
    );
    const resolutionRate = verified > 0 ? Math.round((resolved / verified) * 100) : 0;

    const insights = totalReported === 0
      ? [{ title: "No incident history yet", detail: "Preparedness insights will appear once incident reports are recorded." }]
      : [
          {
            title: `${topFrequency.type} is the leading recurring incident`,
            detail: `${topFrequency.count} of ${totalReported} reported incidents (${Math.round((topFrequency.count / totalReported) * 100)}%) should guide equipment checks, responder drills, and public-safety messaging.`,
          },
          {
            title: `Highest reporting volume: ${peakTrend?.label ?? "current period"}`,
            detail: `${peakTrend?.count ?? 0} incident${peakTrend?.count === 1 ? " was" : "s were"} recorded in this interval. Review staffing and ambulance readiness around similar demand windows.`,
          },
          {
            title: pending > 0 ? `${pending} reports still await triage` : `${resolutionRate}% of verified incidents are resolved`,
            detail: pending > 0
              ? "Review the pending queue to keep incident classification and response coordination current."
              : `${resolved} dispatched incident${resolved === 1 ? " has" : "s have"} been resolved; average recorded response lifecycle is ${avgResponseMinutes} minutes.`,
          },
        ];

    return NextResponse.json({
      data: {
        period,
        frequencies,
        trends,
        summary: {
          totalReported,
          verified,
          pending,
          resolved,
          resolutionRate,
          avgResponseMinutes,
        },
        insights,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/analytics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
