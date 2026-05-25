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

  // Mock data for Roster Entries matching the new design
  const rosterData = [
    {
      id: '1',
      fullName: 'Bastes, Renzy',
      email: 'bastesrenzy@gmail.com',
      role: 'RESPONDER',
      status: 'ACTIVE',
    },
    {
      id: '2',
      fullName: 'Bastes, Renzy',
      email: 'bastesrenzy@gmail.com',
      role: 'RESPONDER',
      status: 'DEACTIVATED',
    },
    {
      id: '3',
      fullName: 'Bastes, Renzy',
      email: 'bastesrenzy@gmail.com',
      role: 'RESPONDER',
      status: 'ACTIVE',
    },
    {
      id: '4',
      fullName: 'Bastes, Renzy',
      email: 'bastesrenzy@gmail.com',
      role: 'RESPONDER',
      status: 'SUSPENDED',
    },
    {
      id: '5',
      fullName: 'Bastes, Renzy',
      email: 'bastesrenzy@gmail.com',
      role: 'RESPONDER',
      status: 'ACTIVE',
    },
    {
      id: '6',
      fullName: 'Bastes, Renzy',
      email: 'bastesrenzy@gmail.com',
      role: 'RESPONDER',
      status: 'ACTIVE',
    },
  ];

  const validatedData = z.array(RosterEntrySchema).parse(rosterData);

  return NextResponse.json({ data: validatedData });
}
