import { NextRequest, NextResponse } from 'next/server';
import { EmergencyIntakeSchema, submitEmergencyIntake } from '@/lib/emergency-intake';

export async function POST(request: NextRequest) {
  try {
    const result = EmergencyIntakeSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid emergency report details', details: result.error.flatten() }, { status: 400 });
    }

    const submitted = await submitEmergencyIntake(result.data, { residentId: null, reporterType: 'GUEST' });
    return NextResponse.json({
      success: true,
      request: submitted.request,
      incident: submitted.incident,
      guestAccessToken: submitted.guestAccessToken,
      autoDispatched: submitted.autoDispatched,
    }, { status: 201 });
  } catch (error) {
    console.error('Guest emergency intake failed:', error);
    return NextResponse.json({ error: 'Unable to submit the emergency report.' }, { status: 500 });
  }
}
