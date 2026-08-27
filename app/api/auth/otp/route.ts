import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase-server";
import crypto from "crypto";
import { z } from "zod";

const RATE_WINDOW_MS = 60 * 60 * 1000;
const SEND_MIN_INTERVAL_MS = 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS_PER_WINDOW = 10;
const MAX_IP_SENDS_PER_WINDOW = 30;
const MAX_IP_VERIFY_ATTEMPTS_PER_WINDOW = 50;
const rateBuckets = new Map<string, number[]>();

const OtpRequestSchema = z.object({
  action: z.enum(['send', 'verify', 'reset']),
  phone: z.string().trim().min(1).max(32),
  otpCode: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code.').optional(),
  token: z.string().uuid('Invalid reset session.').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.')
    .optional(),
}).superRefine((value, context) => {
  if (value.action === 'verify' && !value.otpCode) {
    context.addIssue({ code: 'custom', path: ['otpCode'], message: 'OTP code is required.' });
  }
  if (value.action === 'reset' && (!value.token || !value.password)) {
    context.addIssue({ code: 'custom', path: ['token'], message: 'Reset token and password are required.' });
  }
});

function requestAddress(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function consumeRateLimit(key: string, maxAttempts: number) {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (recent.length >= maxAttempts) {
    rateBuckets.set(key, recent);
    return Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  return 0;
}

// Clean phone helper
function sanitizePhone(phone: string): string {
  let cleaned = phone.trim();
  if (cleaned.startsWith('+63')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('63')) {
    cleaned = '0' + cleaned.slice(2);
  } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

// Convert to international format for SMS delivery
function toInternationalPhone(phone: string): string {
  const cleaned = sanitizePhone(phone);
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return '+63' + cleaned.slice(1);
  }
  return phone;
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = OtpRequestSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid password reset request." }, { status: 400 });
    }

    const body = parsedBody.data;
    const { action, phone } = body;

    const cleanedPhone = sanitizePhone(phone);

    // 1. Send OTP
    if (action === 'send') {
      const userRecord = await db.query.users.findFirst({
        where: eq(users.phone, cleanedPhone),
      });

      if (!userRecord) {
        return NextResponse.json({ error: "No user account with this mobile number was found." }, { status: 404 });
      }

      // The existing OTP expiry lets us enforce a resend cooldown without
      // adding a second timestamp column to the users table.
      const hasFreshOtp = userRecord.otpCode && /^\d{6}$/.test(userRecord.otpCode)
        && userRecord.otpExpiresAt
        && userRecord.otpExpiresAt.getTime() - Date.now() > 5 * 60 * 1000 - SEND_MIN_INTERVAL_MS;
      if (hasFreshOtp) {
        return NextResponse.json({ error: "A reset code was sent recently. Please wait before requesting another one.", retryAfterSeconds: 60 }, { status: 429 });
      }

      const phoneRetryAfter = consumeRateLimit(`send:phone:${cleanedPhone}`, MAX_SENDS_PER_WINDOW);
      const ipRetryAfter = consumeRateLimit(`send:ip:${requestAddress(req)}`, MAX_IP_SENDS_PER_WINDOW);
      if (phoneRetryAfter > 0 || ipRetryAfter > 0) {
        const retryAfterSeconds = Math.max(phoneRetryAfter, ipRetryAfter);
        return NextResponse.json({ error: "Too many reset requests. Please try again later.", retryAfterSeconds }, { status: 429 });
      }

      // Generate a 6-digit verification code
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

      await db.update(users)
        .set({ otpCode, otpExpiresAt })
        .where(eq(users.id, userRecord.id));

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[OTP] Generated verification code for ${cleanedPhone}: ${otpCode}`);
      }

      // Dispatch SMS via the Textbee API if keys are available
      const apiKey = process.env.TEXTBEE_API_KEY;
      const deviceId = process.env.TEXTBEE_DEVICE_ID;
      const recipient = toInternationalPhone(cleanedPhone);
      const message = `DisasTRACE OTP: ${otpCode}. Valid for 5 minutes. Do not share.`;

      if (apiKey && deviceId) {
        try {
          const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/sendSMS`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
            },
            body: JSON.stringify({
              recipients: [recipient],
              message,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error(`[OTP] Textbee API returned status ${response.status}: ${errText}`);
          } else {
            console.log(`[OTP] SMS sent successfully via Textbee to ${recipient}`);
          }
        } catch (fetchErr) {
          console.error("[OTP] Failed to send SMS via Textbee API:", fetchErr);
        }
      } else {
        console.warn("[OTP] Textbee API credentials not found. SMS dispatch was bypassed.");
      }

      const responseData: { success: boolean; message: string; code?: string } = {
        success: true,
        message: "OTP sent successfully.",
      };
      if (process.env.NODE_ENV !== 'production') responseData.code = otpCode;
      return NextResponse.json(responseData);
    }

    // 2. Verify OTP
    if (action === 'verify') {
      const { otpCode } = body;

      const phoneRetryAfter = consumeRateLimit(`verify:phone:${cleanedPhone}`, MAX_VERIFY_ATTEMPTS_PER_WINDOW);
      const ipRetryAfter = consumeRateLimit(`verify:ip:${requestAddress(req)}`, MAX_IP_VERIFY_ATTEMPTS_PER_WINDOW);
      if (phoneRetryAfter > 0 || ipRetryAfter > 0) {
        const retryAfterSeconds = Math.max(phoneRetryAfter, ipRetryAfter);
        return NextResponse.json({ error: "Too many invalid verification attempts. Please request a new code later.", retryAfterSeconds }, { status: 429 });
      }

      const userRecord = await db.query.users.findFirst({
        where: eq(users.phone, cleanedPhone),
      });

      if (
        !userRecord ||
        !userRecord.otpCode ||
        userRecord.otpCode !== otpCode ||
        !userRecord.otpExpiresAt ||
        userRecord.otpExpiresAt < new Date()
      ) {
        return NextResponse.json({ error: "Invalid or expired OTP code." }, { status: 400 });
      }

      // OTP is valid! Generate reset token and extend session for 15 minutes
      const resetToken = crypto.randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await db.update(users)
        .set({ otpCode: resetToken, otpExpiresAt: tokenExpiresAt })
        .where(eq(users.id, userRecord.id));

      rateBuckets.delete(`verify:phone:${cleanedPhone}`);

      return NextResponse.json({
        success: true,
        token: resetToken,
      });
    }

    // 3. Reset Password
    if (action === 'reset') {
      const { token, password } = body;

      const userRecord = await db.query.users.findFirst({
        where: eq(users.phone, cleanedPhone),
      });

      if (
        !userRecord ||
        !userRecord.otpCode ||
        userRecord.otpCode !== token ||
        !userRecord.otpExpiresAt ||
        userRecord.otpExpiresAt < new Date()
      ) {
        return NextResponse.json({ error: "Invalid or expired password reset session." }, { status: 400 });
      }

      // Reset the password in Supabase via Admin client
      const adminClient = createAdminClient();
      const { error: resetError } = await adminClient.auth.admin.updateUserById(userRecord.id, {
        password,
      });

      if (resetError) {
        console.error("[OTP Reset] Supabase Error:", resetError);
        return NextResponse.json({ error: resetError.message }, { status: 500 });
      }

      // Clear the OTP fields
      await db.update(users)
        .set({ otpCode: null, otpExpiresAt: null })
        .where(eq(users.id, userRecord.id));

      return NextResponse.json({
        success: true,
        message: "Password reset successful.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in OTP endpoint:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
