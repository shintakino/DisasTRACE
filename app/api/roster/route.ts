import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';
import { RosterEntrySchema } from '@/types/roster';
import { z } from 'zod';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: `Access denied. This endpoint requires "cdrrmo_super_admin" role, but your session has "${role}".`,
      currentRole: role 
    }, { status: 403 });
  }

  // Mock data for Roster Entries
  const rosterData = [
    {
      id: '1',
      fullName: 'Eloisa Guibani',
      department: 'RESCUE FIVE',
      checkIn: '07:32 AM',
      checkOut: '05:21 PM',
      logHours: '09:49:00',
      status: 'PRESENT',
    },
    {
      id: '2',
      fullName: 'Kyla Mae Sanchez',
      department: 'PACC',
      checkIn: '08:00 AM',
      checkOut: null,
      logHours: '04:00:00',
      status: 'ON-DUTY',
    },
    {
      id: '3',
      fullName: 'Juan Dela Cruz',
      department: 'RESCUE FIVE',
      checkIn: null,
      checkOut: null,
      logHours: '00:00:00',
      status: 'ABSENT',
    },
    {
      id: '4',
      fullName: 'Maria Santos',
      department: 'PACC',
      checkIn: '07:15 AM',
      checkOut: '04:15 PM',
      logHours: '09:00:00',
      status: 'PRESENT',
    },
    {
      id: '5',
      fullName: 'Ricardo Dalisay',
      department: 'RESCUE FIVE',
      checkIn: null,
      checkOut: null,
      logHours: '00:00:00',
      status: 'ON-LEAVE',
    },
    {
      id: '6',
      fullName: 'John Doe',
      department: 'RESCUE FIVE',
      checkIn: '06:45 AM',
      checkOut: '03:45 PM',
      logHours: '09:00:00',
      status: 'PRESENT',
    },
    {
      id: '7',
      fullName: 'Jane Smith',
      department: 'PACC',
      checkIn: '08:30 AM',
      checkOut: null,
      logHours: '03:30:00',
      status: 'ON-DUTY',
    },
  ];

  const validatedData = z.array(RosterEntrySchema).parse(rosterData);

  return NextResponse.json({ data: validatedData });
}
