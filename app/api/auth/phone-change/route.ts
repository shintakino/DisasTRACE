import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase-server';
import { db } from '@/db';
import { phoneVerifications } from '@/db/schema/phone_verifications';
import { users } from '@/db/schema/users';
import { isValidPhilippinePhone, normalizePhilippinePhone } from '@/lib/phone';

const BodySchema = z.object({
  action: z.enum(['send', 'verify']),
  phone: z.string().min(1),
  code: z.string().regex(/^\d{6}$/).optional(),
});

async function getUser() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success || !isValidPhilippinePhone(parsed.data.phone)) {
      return NextResponse.json({ error: 'Enter a valid Philippine mobile number.' }, { status: 400 });
    }
    const phone = normalizePhilippinePhone(parsed.data.phone);
    const current = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { phone: true } });
    if (current?.phone === phone) return NextResponse.json({ success: true, phone, unchanged: true });

    const owner = await db.query.users.findFirst({ where: eq(users.phone, phone), columns: { id: true } });
    if (owner && owner.id !== user.id) return NextResponse.json({ error: 'This mobile number is already registered.' }, { status: 409 });

    if (parsed.data.action === 'send') {
      const code = crypto.randomInt(100000, 999999).toString();
      await db.insert(phoneVerifications).values({ phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
        .onConflictDoUpdate({ target: phoneVerifications.phone, set: { code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });

      const apiKey = process.env.TEXTBEE_API_KEY;
      const deviceId = process.env.TEXTBEE_DEVICE_ID;
      if (apiKey && deviceId) {
        try {
          await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/sendSMS`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({ recipients: [`+63${phone.slice(1)}`], message: `DisasTRACE OTP: ${code}. Valid for 5 minutes. Do not share.` }),
          });
        } catch (error) {
          console.error('[Phone change OTP] SMS delivery failed:', error);
        }
      }
      return NextResponse.json({ success: true, message: 'OTP sent successfully.', ...(process.env.NODE_ENV !== 'production' ? { code } : {}) });
    }

    if (!parsed.data.code) return NextResponse.json({ error: 'OTP code is required.' }, { status: 400 });
    const record = await db.query.phoneVerifications.findFirst({ where: eq(phoneVerifications.phone, phone) });
    if (!record || record.code !== parsed.data.code || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired OTP code.' }, { status: 400 });
    }
    const latestOwner = await db.query.users.findFirst({ where: eq(users.phone, phone), columns: { id: true } });
    if (latestOwner && latestOwner.id !== user.id) return NextResponse.json({ error: 'This mobile number is already registered.' }, { status: 409 });

    await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, user.id));
    const internationalPhone = `+63${phone.slice(1)}`;
    const { error: authUpdateError } = await createAdminClient().auth.admin.updateUserById(user.id, {
      phone: internationalPhone,
      phone_confirm: true,
      user_metadata: { ...user.user_metadata, phone },
    });
    if (authUpdateError) throw authUpdateError;
    await db.delete(phoneVerifications).where(eq(phoneVerifications.phone, phone));
    return NextResponse.json({ success: true, phone });
  } catch (error) {
    console.error('[Phone change OTP] request failed:', error);
    return NextResponse.json({ error: 'Unable to verify the phone number right now.' }, { status: 500 });
  }
}
