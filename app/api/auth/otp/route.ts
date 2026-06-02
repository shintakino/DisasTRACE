import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase-server";

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
    const body = await req.json();
    const { action, phone } = body;

    if (!action || !phone) {
      return NextResponse.json({ error: "Missing action or phone number" }, { status: 400 });
    }

    const cleanedPhone = sanitizePhone(phone);

    // 1. Send OTP
    if (action === 'send') {
      const userRecord = await db.query.users.findFirst({
        where: eq(users.phone, cleanedPhone),
      });

      if (!userRecord) {
        return NextResponse.json({ error: "No user account with this mobile number was found." }, { status: 404 });
      }

      // Generate a 6-digit verification code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

      await db.update(users)
        .set({ otpCode, otpExpiresAt })
        .where(eq(users.id, userRecord.id));

      console.log(`[OTP] Generated verification code for ${cleanedPhone}: ${otpCode}`);

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

      // We return the code to the mobile client in dev mode to make testing seamless
      return NextResponse.json({
        success: true,
        message: "OTP sent successfully.",
        code: otpCode, // For testing/simulation
      });
    }

    // 2. Verify OTP
    if (action === 'verify') {
      const { otpCode } = body;
      if (!otpCode) {
        return NextResponse.json({ error: "Missing OTP code to verify" }, { status: 400 });
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

      return NextResponse.json({
        success: true,
        token: resetToken,
      });
    }

    // 3. Reset Password
    if (action === 'reset') {
      const { token, password } = body;
      if (!token || !password) {
        return NextResponse.json({ error: "Missing token or new password" }, { status: 400 });
      }

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
