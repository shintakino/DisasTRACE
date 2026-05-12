import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';
import { ResponderSchema } from '@/types/dashboard';
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

  // Mock data for responders
  const responders = z.array(ResponderSchema).parse([
    { id: '1', name: 'Eloisa Guibani', status: 'DISPATCHED', initials: 'EG' },
    { id: '2', name: 'Kyla Mae Sanchez', status: 'STANDBY', initials: 'KM' },
    { id: '3', name: 'Juan Dela Cruz', status: 'OFF DUTY', initials: 'JD' },
    { id: '4', name: 'Maria Santos', status: 'DISPATCHED', initials: 'MS' },
    { id: '5', name: 'Ricardo Dalisay', status: 'STANDBY', initials: 'RD' },
  ]);

  return NextResponse.json({ data: responders });
}
