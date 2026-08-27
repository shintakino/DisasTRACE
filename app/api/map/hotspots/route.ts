import { NextResponse } from 'next/server';
import { and, gte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { verificationRequests } from '@/db/schema/verification_requests';
import { createClient } from '@/lib/supabase-server';

const HOTSPOT_LOOKBACK_DAYS = 30;
const HOTSPOT_CELL_SIZE = 0.01;
const HOTSPOT_MIN_REPORTS = 3;

interface IncidentHotspot {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const since = new Date(Date.now() - HOTSPOT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const recentReports = await db
      .select({
        latitude: verificationRequests.latitude,
        longitude: verificationRequests.longitude,
      })
      .from(verificationRequests)
      .where(and(
        gte(verificationRequests.createdAt, since),
        inArray(verificationRequests.status, ['PENDING', 'VERIFIED']),
      ));

    const cells = new Map<string, { latitudeTotal: number; longitudeTotal: number; count: number }>();

    for (const report of recentReports) {
      if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) continue;

      const latitudeCell = Math.floor(report.latitude / HOTSPOT_CELL_SIZE);
      const longitudeCell = Math.floor(report.longitude / HOTSPOT_CELL_SIZE);
      const key = `${latitudeCell}:${longitudeCell}`;
      const current = cells.get(key) || { latitudeTotal: 0, longitudeTotal: 0, count: 0 };
      current.latitudeTotal += report.latitude;
      current.longitudeTotal += report.longitude;
      current.count += 1;
      cells.set(key, current);
    }

    const hotspots: IncidentHotspot[] = Array.from(cells.entries())
      .filter(([, cell]) => cell.count >= HOTSPOT_MIN_REPORTS)
      .map(([id, cell]) => ({
        id,
        latitude: cell.latitudeTotal / cell.count,
        longitude: cell.longitudeTotal / cell.count,
        count: cell.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return NextResponse.json({
      data: hotspots,
      lookbackDays: HOTSPOT_LOOKBACK_DAYS,
    });
  } catch (error) {
    console.error('Error fetching public map hotspots:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
