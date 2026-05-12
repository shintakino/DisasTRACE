import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Mock data for KPIs
  const kpis = {
    totalIncidentsToday: 24,
    totalResponders: 12,
    totalResolvedToday: 18,
    avgResponseTime: '8m',
  };

  return NextResponse.json({ data: kpis });
}
