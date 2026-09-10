import { NextRequest, NextResponse } from 'next/server';
import { GuestEmergencyIntakeSchema, submitEmergencyIntake } from '@/lib/emergency-intake';
import { db } from '@/db';
import { systemSettings } from '@/db/schema/system_settings';
import { verificationRequests } from '@/db/schema/verification_requests';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT, hasReachedGuestReportLimit } from '@/lib/guest-report-limit';
import { philippineMobileNumberVariants, samePhilippineMobileNumber } from '@/lib/phone-number';

export async function POST(request: NextRequest) {
  try {
    const result = GuestEmergencyIntakeSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid emergency report details', details: result.error.flatten() }, { status: 400 });
    }

    // A retry of the same draft never consumes another report allowance.
    const priorChatbotRequest = result.data.chatbotSubmissionId
      ? await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.id, result.data.chatbotSubmissionId),
        columns: { id: true, reporterType: true, contactNumber: true },
      })
      : null;
    const isOwnedRetry = priorChatbotRequest?.reporterType === 'GUEST'
      && samePhilippineMobileNumber(priorChatbotRequest.contactNumber, result.data.contactNumber);
    if (!isOwnedRetry) {
      const settings = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.id, 'current'),
        columns: { guestReportsPerPhoneLimit: true },
      });
      const guestLimit = settings?.guestReportsPerPhoneLimit ?? DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT;
      const [{ total }] = await db.select({ total: count() }).from(verificationRequests).where(and(
        eq(verificationRequests.reporterType, 'GUEST'),
        inArray(verificationRequests.contactNumber, philippineMobileNumberVariants(result.data.contactNumber)),
      ));
      if (hasReachedGuestReportLimit(Number(total), guestLimit)) {
        return NextResponse.json({
          error: `This phone number has reached its Guest Mode limit of ${guestLimit} lifetime reports. Please register or sign in to submit another report.`,
          limit: guestLimit,
        }, { status: 429 });
      }
    }

    const submitted = await submitEmergencyIntake(result.data, { residentId: null, reporterType: 'GUEST' });
    return NextResponse.json({
      success: true,
      request: submitted.request,
      incident: submitted.incident,
      guestAccessToken: submitted.guestAccessToken,
      autoDispatched: submitted.autoDispatched,
      replayed: submitted.replayed,
    }, { status: submitted.replayed ? 200 : 201 });
  } catch (error) {
    console.error('Guest emergency intake failed:', error);
    return NextResponse.json({ error: 'Unable to submit the emergency report.' }, { status: 500 });
  }
}
