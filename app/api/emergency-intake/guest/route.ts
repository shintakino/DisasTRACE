import { NextRequest, NextResponse } from 'next/server';
import { GuestEmergencyIntakeSchema, submitEmergencyIntake } from '@/lib/emergency-intake';
import { db } from '@/db';
import { systemSettings } from '@/db/schema/system_settings';
import { verificationRequests } from '@/db/schema/verification_requests';
import { and, count, eq, gte } from 'drizzle-orm';

function startOfManilaDay() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) - 8 * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const result = GuestEmergencyIntakeSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid emergency report details', details: result.error.flatten() }, { status: 400 });
    }

    const settings = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.id, 'current'),
      columns: { guestRequestsPerDay: true },
    });
    const guestLimit = settings?.guestRequestsPerDay ?? 50;
    const dayStart = startOfManilaDay();
    const [{ total }] = await db
      .select({ total: count() })
      .from(verificationRequests)
      .where(and(
        eq(verificationRequests.reporterType, 'GUEST'),
        gte(verificationRequests.createdAt, dayStart),
      ));

    if (Number(total) >= guestLimit) {
      const nextReset = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      return NextResponse.json({
        error: 'Guest Mode has reached today\'s request limit. Please try again tomorrow or sign in to submit a report.',
        limit: guestLimit,
        used: Number(total),
        resetAt: nextReset.toISOString(),
      }, {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((nextReset.getTime() - Date.now()) / 1000))) },
      });
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
