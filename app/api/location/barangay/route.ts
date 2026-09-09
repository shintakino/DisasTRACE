import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveBaliwagBarangay } from '@/lib/barangay-boundaries';

const LocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

// The device sends its current GPS point. The server resolves it against the
// checked-in official PSA boundary polygons so the mobile UI and report data
// use the same barangay source of truth.
export async function POST(request: NextRequest) {
  try {
    const parsed = LocationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid location coordinates.' }, { status: 400 });
    }

    const barangay = resolveBaliwagBarangay(parsed.data.latitude, parsed.data.longitude);
    // This lookup persists no user data and exposes only public administrative
    // boundaries, so it is also available to a guest before a report exists.
    return NextResponse.json({
      data: barangay
        ? { city: 'Baliwag City', barangay: barangay.name, barangayPsgcCode: barangay.psgcCode }
        : { city: null, barangay: null, barangayPsgcCode: null },
    });
  } catch (error) {
    console.error('Unable to resolve device barangay:', error);
    return NextResponse.json({ error: 'Unable to resolve the current location.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
