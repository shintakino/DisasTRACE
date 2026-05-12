import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Mock data for responders
  const responders = [
    { id: '1', name: 'Juan Dela Cruz', status: 'DISPATCHED', initials: 'JD' },
    { id: '2', name: 'Maria Santos', status: 'ON-SCENE', initials: 'MS' },
    { id: '3', name: 'Ricardo Reyes', status: 'AVAILABLE', initials: 'RR' },
    { id: '4', name: 'Elena Garcia', status: 'EN-ROUTE', initials: 'EG' },
    { id: '5', name: 'Antonio Luna', status: 'AVAILABLE', initials: 'AL' },
    { id: '6', name: 'Jose Rizal', status: 'DISPATCHED', initials: 'JR' },
  ];

  return NextResponse.json({ data: responders });
}
