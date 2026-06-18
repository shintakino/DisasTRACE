import { NextResponse } from 'next/server';
import { db } from "@/db";
import { verificationRequests } from "@/db/schema/verification_requests";
import { sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const trendFilter = searchParams.get('trendFilter') || 'this_year';
    const distFilter = searchParams.get('distFilter') || 'this_month';

    const normalizedTrendFilter = trendFilter.toLowerCase();
    const normalizedDistFilter = distFilter.toLowerCase();

    // 1. Fetch real incident type distribution from database
    const distQuery = db
      .select({
        type: verificationRequests.type,
        count: sql<number>`count(*)`
      })
      .from(verificationRequests);

    if (normalizedDistFilter === 'today') {
      distQuery.where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= timezone('Asia/Manila', CURRENT_DATE)`);
    } else if (normalizedDistFilter === 'this_week') {
      distQuery.where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('week', timezone('Asia/Manila', now()))`);
    } else if (normalizedDistFilter === 'this_month') {
      distQuery.where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('month', timezone('Asia/Manila', now()))`);
    } else if (normalizedDistFilter === 'this_year') {
      distQuery.where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('year', timezone('Asia/Manila', now()))`);
    }

    const dbDistribution = await distQuery.groupBy(verificationRequests.type);

    // Map database enum types to dashboard display names and specific brand colors
    const typeColorMap: Record<string, { name: string; fill: string }> = {
      'Vehicular Collision': { name: 'Vehicular Collision', fill: '#15286A' },
      'Medical Emergency': { name: 'Medical Emergency', fill: '#A80107' },
      'Structural Failure': { name: 'Structural Failure', fill: '#E77F00' },
      'Fire Emergency': { name: 'Fire / Explosion', fill: '#0F4503' },
      'Flood/Water': { name: 'Flood / Water', fill: '#2803A2' },
      'Unknown Cause': { name: 'Unknown Cause', fill: '#9B058C' },
    };

    // Dynamic distribution computation
    const distribution = Object.entries(typeColorMap).map(([key, info]) => {
      const dbMatch = dbDistribution.find(d => d.type === key);
      return {
        name: info.name,
        value: dbMatch ? Number(dbMatch.count) : 0,
        fill: info.fill,
      };
    });

    // 2. Fetch real incident trends grouped by period and type from database
    let trends: any[] = [];
    const typeKeyMap: Record<string, string> = {
      'Vehicular Collision': 'vehicular',
      'Medical Emergency': 'medical',
      'Structural Failure': 'structural',
      'Fire Emergency': 'fire',
      'Flood/Water': 'water',
      'Unknown Cause': 'unknown',
    };

    if (normalizedTrendFilter === 'today') {
      const dbTrends = await db
        .select({
          hourBlock: sql<number>`floor(extract(hour from timezone('Asia/Manila', ${verificationRequests.createdAt})) / 4) * 4`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= timezone('Asia/Manila', CURRENT_DATE)`)
        .groupBy(
          sql`floor(extract(hour from timezone('Asia/Manila', ${verificationRequests.createdAt})) / 4) * 4`,
          verificationRequests.type
        );

      const hourBlocks = [
        { block: 0, label: '12 AM' },
        { block: 4, label: '4 AM' },
        { block: 8, label: '8 AM' },
        { block: 12, label: '12 PM' },
        { block: 16, label: '4 PM' },
        { block: 20, label: '8 PM' }
      ];

      trends = hourBlocks.map((hb) => ({
        month: hb.label,
        vehicular: 0,
        medical: 0,
        structural: 0,
        fire: 0,
        water: 0,
        unknown: 0,
      }));

      dbTrends.forEach((row) => {
        const blockObj = hourBlocks.find((hb) => hb.block === Number(row.hourBlock));
        if (blockObj) {
          const trend = trends.find((t) => t.month === blockObj.label);
          if (trend) {
            const key = typeKeyMap[row.type];
            if (key) {
              trend[key] = Number(row.count);
            }
          }
        }
      });
    } else if (normalizedTrendFilter === 'this_week') {
      const dbTrends = await db
        .select({
          day: sql<string>`trim(to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Dy'))`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('week', timezone('Asia/Manila', now()))`)
        .groupBy(
          sql`to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Dy')`,
          sql`extract(isodow from timezone('Asia/Manila', ${verificationRequests.createdAt}))`,
          verificationRequests.type
        )
        .orderBy(sql`extract(isodow from timezone('Asia/Manila', ${verificationRequests.createdAt}))`);

      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      trends = weekdays.map((day) => ({
        month: day,
        vehicular: 0,
        medical: 0,
        structural: 0,
        fire: 0,
        water: 0,
        unknown: 0,
      }));

      dbTrends.forEach((row) => {
        const trend = trends.find((t) => t.month === row.day);
        if (trend) {
          const key = typeKeyMap[row.type];
          if (key) {
            trend[key] = Number(row.count);
          }
        }
      });
    } else if (normalizedTrendFilter === 'this_month') {
      const dbTrends = await db
        .select({
          weekOfMonth: sql<number>`floor((extract(day from timezone('Asia/Manila', ${verificationRequests.createdAt})) - 1) / 7) + 1`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('month', timezone('Asia/Manila', now()))`)
        .groupBy(
          sql`floor((extract(day from timezone('Asia/Manila', ${verificationRequests.createdAt})) - 1) / 7) + 1`,
          verificationRequests.type
        );

      const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5'];
      trends = weeks.map((week) => ({
        month: week,
        vehicular: 0,
        medical: 0,
        structural: 0,
        fire: 0,
        water: 0,
        unknown: 0,
      }));

      dbTrends.forEach((row) => {
        const weekLabel = `Wk ${row.weekOfMonth}`;
        const trend = trends.find((t) => t.month === weekLabel);
        if (trend) {
          const key = typeKeyMap[row.type];
          if (key) {
            trend[key] = Number(row.count);
          }
        }
      });
    } else {
      // this_year (default)
      const dbTrends = await db
        .select({
          month: sql<string>`trim(to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Mon'))`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(sql`timezone('Asia/Manila', ${verificationRequests.createdAt}) >= date_trunc('year', timezone('Asia/Manila', now()))`)
        .groupBy(
          sql`to_char(timezone('Asia/Manila', ${verificationRequests.createdAt}), 'Mon')`,
          sql`extract(month from timezone('Asia/Manila', ${verificationRequests.createdAt}))`,
          verificationRequests.type
        )
        .orderBy(sql`extract(month from timezone('Asia/Manila', ${verificationRequests.createdAt}))`);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      trends = monthNames.map((month) => ({
        month,
        vehicular: 0,
        medical: 0,
        structural: 0,
        fire: 0,
        water: 0,
        unknown: 0,
      }));

      dbTrends.forEach((row) => {
        const trend = trends.find((t) => t.month === row.month);
        if (trend) {
          const key = typeKeyMap[row.type];
          if (key) {
            trend[key] = Number(row.count);
          }
        }
      });
    }

    return NextResponse.json({ data: { trends, distribution } });
  } catch (error) {
    console.error("Error in GET /api/dashboard/trends:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
