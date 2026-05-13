import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';
import { KpiDataSchema } from '@/types/dashboard';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin' && role !== 'pacc_admin') {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: `Access denied. This dashboard requires Admin privileges, but your session has "${role}".`,
      currentRole: role 
    }, { status: 403 });
  }

  // Mock data for KPIs
  const kpis = KpiDataSchema.parse({
    totalIncidentsToday: 29,
    totalResponders: 7,
    totalResolvedToday: 15,
    avgResponseTime: '9',
  });

  return NextResponse.json({ data: kpis });
}
