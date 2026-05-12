import { NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';
import { IncidentTrendSchema, IncidentDistributionSchema } from '@/types/dashboard';
import { z } from 'zod';

export async function GET(request: Request) {
  const role = await getUserRole();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'monthly';

  if (role !== 'cdrrmo_super_admin') {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      message: `Access denied. This dashboard requires "cdrrmo_super_admin" role, but your session has "${role}".`,
      currentRole: role 
    }, { status: 403 });
  }

  // Mock data for trends (Monthly Incident Summary) - Remains monthly for the trend chart
  const trends = z.array(IncidentTrendSchema).parse([
    { month: 'Jan', vehicular: 40, medical: 24, structural: 10, fire: 5, water: 15, unknown: 6 },
    { month: 'Feb', vehicular: 30, medical: 35, structural: 5, fire: 8, water: 20, unknown: 7 },
    { month: 'Mar', vehicular: 45, medical: 20, structural: 15, fire: 10, water: 10, unknown: 5 },
    { month: 'Apr', vehicular: 50, medical: 30, structural: 8, fire: 5, water: 12, unknown: 8 },
    { month: 'May', vehicular: 35, medical: 40, structural: 12, fire: 6, water: 18, unknown: 4 },
    { month: 'Jun', vehicular: 60, medical: 25, structural: 20, fire: 10, water: 10, unknown: 5 },
    { month: 'Jul', vehicular: 55, medical: 45, structural: 15, fire: 5, water: 5, unknown: 3 },
    { month: 'Aug', vehicular: 40, medical: 50, structural: 10, fire: 12, water: 15, unknown: 7 },
    { month: 'Sep', vehicular: 45, medical: 35, structural: 12, fire: 8, water: 20, unknown: 9 },
    { month: 'Oct', vehicular: 50, medical: 40, structural: 8, fire: 15, water: 12, unknown: 6 },
    { month: 'Nov', vehicular: 35, medical: 45, structural: 15, fire: 5, water: 10, unknown: 5 },
    { month: 'Dec', vehicular: 60, medical: 30, structural: 20, fire: 10, water: 15, unknown: 8 },
  ]);

  // Mock data for distribution (Pie Chart) - Changes based on period
  let rawDistribution = [
    { name: 'Vehicular Collision', value: 44, fill: '#1E3A8A' },
    { name: 'Medical Emergency', value: 17, fill: '#991B1B' },
    { name: 'Structural Failure', value: 11, fill: '#EA580C' },
    { name: 'Fire / Explosion', value: 6, fill: '#166534' },
    { name: 'Flood / Water', value: 17, fill: '#4338CA' },
    { name: 'Unknown Cause', value: 5, fill: '#A21CAF' },
  ];

  if (period === 'weekly') {
    rawDistribution = [
      { name: 'Vehicular Collision', value: 30, fill: '#1E3A8A' },
      { name: 'Medical Emergency', value: 40, fill: '#991B1B' },
      { name: 'Structural Failure', value: 5, fill: '#EA580C' },
      { name: 'Fire / Explosion', value: 10, fill: '#166534' },
      { name: 'Flood / Water', value: 10, fill: '#4338CA' },
      { name: 'Unknown Cause', value: 5, fill: '#A21CAF' },
    ];
  } else if (period === 'yearly') {
    rawDistribution = [
      { name: 'Vehicular Collision', value: 35, fill: '#1E3A8A' },
      { name: 'Medical Emergency', value: 25, fill: '#991B1B' },
      { name: 'Structural Failure', value: 15, fill: '#EA580C' },
      { name: 'Fire / Explosion', value: 10, fill: '#166534' },
      { name: 'Flood / Water', value: 10, fill: '#4338CA' },
      { name: 'Unknown Cause', value: 5, fill: '#A21CAF' },
    ];
  }

  const distribution = z.array(IncidentDistributionSchema).parse(rawDistribution);

  return NextResponse.json({ data: { trends, distribution } });
}
