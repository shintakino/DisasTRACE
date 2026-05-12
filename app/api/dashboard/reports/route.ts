import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Mock data for recent incident reports
  const reports = [
    {
      id: 'DR-2026-0047',
      vehicleId: 'AMB-001',
      origin: 'CDRRMO HQ',
      destination: 'Brgy. Sabang',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'DR-2026-0048',
      vehicleId: 'AMB-003',
      origin: 'Brgy. Pagala',
      destination: 'Baliwag District Hospital',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'DR-2026-0049',
      vehicleId: 'AMB-002',
      origin: 'SM City Baliwag',
      destination: 'CDRRMO HQ',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'DR-2026-0050',
      vehicleId: 'AMB-005',
      origin: 'Brgy. Makinabang',
      destination: 'Bulacan Medical Center',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'DR-2026-0051',
      vehicleId: 'AMB-001',
      origin: 'CDRRMO HQ',
      destination: 'Brgy. Tangos',
      timestamp: new Date().toISOString(),
    },
  ];

  return NextResponse.json({ data: reports });
}
