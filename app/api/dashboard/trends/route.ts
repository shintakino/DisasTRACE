import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

export async function GET() {
  const role = await getUserRole();

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Mock data for trends (Monthly Incident Summary)
  const trends = [
    { month: 'Jan', vehicular: 40, medical: 24, fire: 10, other: 15 },
    { month: 'Feb', vehicular: 30, medical: 35, fire: 5, other: 20 },
    { month: 'Mar', vehicular: 45, medical: 20, fire: 15, other: 10 },
    { month: 'Apr', vehicular: 50, medical: 30, fire: 8, other: 12 },
    { month: 'May', vehicular: 35, medical: 40, fire: 12, other: 18 },
    { month: 'Jun', vehicular: 60, medical: 25, fire: 20, other: 10 },
    { month: 'Jul', vehicular: 55, medical: 45, fire: 15, other: 5 },
    { month: 'Aug', vehicular: 40, medical: 50, fire: 10, other: 15 },
    { month: 'Sep', vehicular: 45, medical: 35, fire: 12, other: 20 },
    { month: 'Oct', vehicular: 50, medical: 40, fire: 8, other: 12 },
    { month: 'Nov', vehicular: 35, medical: 45, fire: 15, other: 10 },
    { month: 'Dec', vehicular: 60, medical: 30, fire: 20, other: 15 },
  ];

  // Mock data for distribution (Pie Chart)
  const distribution = [
    { name: 'Vehicular Collision', value: 35, fill: '#EF4444' }, // Error/Red
    { name: 'Medical Emergency', value: 25, fill: '#3B82F6' }, // Info/Blue
    { name: 'Structural Failure', value: 15, fill: '#F97316' }, // Warning/Orange
    { name: 'Fire/Explosion', value: 10, fill: '#9333EA' }, // Purple
    { name: 'Flood/Water', value: 10, fill: '#06B6D4' }, // Cyan
    { name: 'Unknown Cause', value: 5, fill: '#6B7280' }, // Grey
  ];

  return NextResponse.json({ data: { trends, distribution } });
}
