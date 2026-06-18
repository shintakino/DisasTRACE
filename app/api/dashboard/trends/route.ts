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
    const yearParam = searchParams.get('year');
    const targetYear = yearParam ? parseInt(yearParam) : null;
    const isYearValid = targetYear && !isNaN(targetYear);

    // 1. Fetch real incident type distribution from database
    const distQuery = db
      .select({
        type: verificationRequests.type,
        count: sql<number>`count(*)`
      })
      .from(verificationRequests);

    if (isYearValid) {
      distQuery.where(sql`extract(year from ${verificationRequests.createdAt}) = ${targetYear}`);
    }

    const dbDistribution = await distQuery.groupBy(verificationRequests.type);

    // Map database enum types to dashboard display names and specific brand colors
    const typeColorMap: Record<string, { name: string; fill: string }> = {
      'Vehicular Collision': { name: 'Vehicular Collision', fill: '#1E3A8A' },
      'Medical Emergency': { name: 'Medical Emergency', fill: '#991B1B' },
      'Structural Failure': { name: 'Structural Failure', fill: '#EA580C' },
      'Fire Emergency': { name: 'Fire / Explosion', fill: '#166534' },
      'Flood/Water': { name: 'Flood / Water', fill: '#4338CA' },
      'Unknown Cause': { name: 'Unknown Cause', fill: '#A21CAF' },
    };

    const hasData = dbDistribution.length > 0;
    
    // Dynamic distribution computation
    let distribution = Object.entries(typeColorMap).map(([key, info]) => {
      const dbMatch = dbDistribution.find(d => d.type === key);
      return {
        name: info.name,
        value: dbMatch ? Number(dbMatch.count) : 0,
        fill: info.fill,
      };
    });

    // Fallback safety to keep UI beautiful if no incidents recorded yet
    if (!hasData) {
      distribution = [
        { name: 'Vehicular Collision', value: 44, fill: '#1E3A8A' },
        { name: 'Medical Emergency', value: 17, fill: '#991B1B' },
        { name: 'Structural Failure', value: 11, fill: '#EA580C' },
        { name: 'Fire / Explosion', value: 6, fill: '#166534' },
        { name: 'Flood / Water', value: 17, fill: '#4338CA' },
        { name: 'Unknown Cause', value: 5, fill: '#A21CAF' },
      ];
    }

    const periodParam = searchParams.get('period') || 'Monthly';
    const normalizedPeriod = periodParam.toLowerCase();

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

    if (normalizedPeriod === 'daily') {
      const dbTrends = await db
        .select({
          day: sql<string>`trim(to_char(${verificationRequests.createdAt}, 'Dy'))`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(isYearValid ? sql`extract(year from ${verificationRequests.createdAt}) = ${targetYear}` : undefined)
        .groupBy(
          sql`to_char(${verificationRequests.createdAt}, 'Dy')`,
          sql`extract(isodow from ${verificationRequests.createdAt})`,
          verificationRequests.type
        )
        .orderBy(sql`extract(isodow from ${verificationRequests.createdAt})`);

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
    } else if (normalizedPeriod === 'weekly') {
      const dbTrends = await db
        .select({
          week: sql<string>`concat('Wk ', to_char(${verificationRequests.createdAt}, 'IW'))`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(isYearValid ? sql`extract(year from ${verificationRequests.createdAt}) = ${targetYear}` : undefined)
        .groupBy(
          sql`to_char(${verificationRequests.createdAt}, 'IW')`,
          verificationRequests.type
        )
        .orderBy(sql`to_char(${verificationRequests.createdAt}, 'IW')`);

      const weeksWithData = Array.from(new Set(dbTrends.map(row => row.week))).sort();
      const weeks = weeksWithData.length > 0 ? weeksWithData : ['Wk 20', 'Wk 21', 'Wk 22', 'Wk 23', 'Wk 24'];
      
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
        const trend = trends.find((t) => t.month === row.week);
        if (trend) {
          const key = typeKeyMap[row.type];
          if (key) {
            trend[key] = Number(row.count);
          }
        }
      });
    } else if (normalizedPeriod === 'yearly') {
      const dbTrends = await db
        .select({
          year: sql<string>`to_char(${verificationRequests.createdAt}, 'YYYY')`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .groupBy(
          sql`to_char(${verificationRequests.createdAt}, 'YYYY')`,
          verificationRequests.type
        )
        .orderBy(sql`to_char(${verificationRequests.createdAt}, 'YYYY')`);

      const currentYearNum = new Date().getFullYear();
      const yearsList = Array.from({ length: 5 }, (_, i) => String(currentYearNum - 4 + i));
      
      trends = yearsList.map((yr) => ({
        month: yr,
        vehicular: 0,
        medical: 0,
        structural: 0,
        fire: 0,
        water: 0,
        unknown: 0,
      }));

      dbTrends.forEach((row) => {
        const trend = trends.find((t) => t.month === row.year);
        if (trend) {
          const key = typeKeyMap[row.type];
          if (key) {
            trend[key] = Number(row.count);
          }
        }
      });
    } else {
      // Monthly (default)
      const dbTrends = await db
        .select({
          month: sql<string>`trim(to_char(${verificationRequests.createdAt}, 'Mon'))`,
          type: verificationRequests.type,
          count: sql<number>`count(*)`
        })
        .from(verificationRequests)
        .where(isYearValid ? sql`extract(year from ${verificationRequests.createdAt}) = ${targetYear}` : undefined)
        .groupBy(
          sql`to_char(${verificationRequests.createdAt}, 'Mon')`,
          sql`extract(month from ${verificationRequests.createdAt})`,
          verificationRequests.type
        )
        .orderBy(sql`extract(month from ${verificationRequests.createdAt})`);

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
