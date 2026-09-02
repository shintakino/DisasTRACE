import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { users } from '@/db/schema/users';
import { RegisteredEmergencyIntakeSchema, RegisteredEmergencyIntakeSubmissionSchema, submitEmergencyIntake } from '@/lib/emergency-intake';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resident = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!resident || resident.role !== 'public_user' || resident.status !== 'ACTIVE' || resident.verificationStatus !== 'APPROVED') {
      return NextResponse.json({ error: 'Your account is not permitted to submit a report.' }, { status: 403 });
    }

    const payload = RegisteredEmergencyIntakeSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid emergency report details', details: payload.error.flatten() }, { status: 400 });
    }

    const report = RegisteredEmergencyIntakeSubmissionSchema.safeParse({
      ...payload.data,
      contactNumber: resident.phone,
    });
    if (!report.success) {
      return NextResponse.json({
        error: 'Your verified account needs a valid Philippine mobile number before you can submit a chatbot report.',
        details: report.error.flatten(),
      }, { status: 400 });
    }

    const submitted = await submitEmergencyIntake(report.data, { residentId: resident.id, reporterType: 'REGISTERED' });
    return NextResponse.json({ success: true, request: submitted.request, incident: submitted.incident, autoDispatched: submitted.autoDispatched, replayed: submitted.replayed }, { status: submitted.replayed ? 200 : 201 });
  } catch (error) {
    console.error('Registered emergency intake failed:', error);
    return NextResponse.json({ error: 'Unable to submit the emergency report.' }, { status: 500 });
  }
}
