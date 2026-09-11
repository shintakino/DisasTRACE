import { NextRequest, NextResponse } from 'next/server';
import { GuestEmergencyIntakeSchema, submitEmergencyIntake } from '@/lib/emergency-intake';
import { db } from '@/db';
import { systemSettings } from '@/db/schema/system_settings';
import { verificationRequests } from '@/db/schema/verification_requests';
import { guestDeviceReportQuotas } from '@/db/schema/guest_device_report_quotas';
import { and, count, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT, hashGuestDeviceId, hasReachedGuestReportLimit } from '@/lib/guest-report-limit';
import { philippineMobileNumberVariants, samePhilippineMobileNumber } from '@/lib/phone-number';
import { GuestDeviceIdSchema } from '@/lib/emergency-intake';

async function reserveGuestDeviceAllowance(deviceHash: string, limit: number) {
  const now = new Date();
  const [quota] = await db.insert(guestDeviceReportQuotas)
    .values({ deviceHash, reportCount: 1, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: guestDeviceReportQuotas.deviceHash,
      set: {
        reportCount: sql`${guestDeviceReportQuotas.reportCount} + 1`,
        updatedAt: now,
      },
      where: lt(guestDeviceReportQuotas.reportCount, limit),
    })
    .returning({ reportCount: guestDeviceReportQuotas.reportCount });
  return quota ?? null;
}

async function releaseGuestDeviceAllowance(deviceHash: string) {
  await db.update(guestDeviceReportQuotas)
    .set({
      reportCount: sql`GREATEST(${guestDeviceReportQuotas.reportCount} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(and(eq(guestDeviceReportQuotas.deviceHash, deviceHash), gt(guestDeviceReportQuotas.reportCount, 0)));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = GuestEmergencyIntakeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid emergency report details', details: result.error.flatten() }, { status: 400 });
    }
    const deviceId = GuestDeviceIdSchema.safeParse(body?.deviceId);
    if (!deviceId.success) {
      return NextResponse.json({ error: 'A trusted Android device identifier is required for Guest Mode.', details: deviceId.error.flatten() }, { status: 400 });
    }
    const deviceHash = hashGuestDeviceId(deviceId.data);

    // A retry of the same draft never consumes another report allowance.
    const priorChatbotRequest = result.data.chatbotSubmissionId
      ? await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.id, result.data.chatbotSubmissionId),
        columns: { id: true, reporterType: true, contactNumber: true, guestDeviceHash: true },
      })
      : null;
    const isOwnedRetry = priorChatbotRequest?.reporterType === 'GUEST'
      && samePhilippineMobileNumber(priorChatbotRequest.contactNumber, result.data.contactNumber)
      && priorChatbotRequest.guestDeviceHash === deviceHash;
    let deviceAllowanceReserved = false;
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

      // This conditional upsert is the server authority for the device quota:
      // a different phone on the same Android device cannot reset the limit.
      const reservation = await reserveGuestDeviceAllowance(deviceHash, guestLimit);
      if (!reservation) {
        return NextResponse.json({
          error: `This device has reached its Guest Mode limit of ${guestLimit} lifetime reports. Please register or sign in to submit another report.`,
          limit: guestLimit,
        }, { status: 429 });
      }
      deviceAllowanceReserved = true;
    }

    let submitted;
    try {
      submitted = await submitEmergencyIntake(result.data, { residentId: null, reporterType: 'GUEST', guestDeviceHash: deviceHash });
    } catch (error) {
      if (deviceAllowanceReserved) await releaseGuestDeviceAllowance(deviceHash).catch(() => undefined);
      throw error;
    }
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
