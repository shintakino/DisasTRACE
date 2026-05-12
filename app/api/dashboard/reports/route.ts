import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';
import { RecentReportSchema } from '@/types/dashboard';
import { z } from 'zod';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: `Access denied. This dashboard requires "cdrrmo_super_admin" role, but your session has "${role}".`,
      currentRole: role 
    }, { status: 403 });
  }

  // Mock data for recent incident reports
  const reports = z.array(RecentReportSchema).parse([
    {
      id: 'DR-2026-0047',
      vehicleId: 'AMB-001',
      origin: 'CDRRMO HQ',
      destination: 'Brgy. Sabang, Baliwag City',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'DR-2026-0041',
      vehicleId: 'AMB-002',
      origin: 'CDRRMO HQ',
      destination: 'San Jose Hwy, Baliwag City',
      timestamp: new Date().toISOString(),
    },
  ]);

  return NextResponse.json({ data: reports });
}
