import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { phoneVerifications } from "@/db/schema/phone_verifications";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Clean phone helper
function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '').trim();
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
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const cleanedPhone = sanitizePhone(phone);

    // Validate Philippine phone format (must be 11 digits starting with 09)
    if (!/^09\d{9}$/.test(cleanedPhone)) {
      return NextResponse.json({ 
        error: "Invalid mobile number format. Must be a valid Philippine mobile number starting with 09 or +63." 
      }, { status: 400 });
    }

    // Check if the phone number is already registered in the users table
    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, cleanedPhone),
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: "This mobile number is already registered." 
      }, { status: 409 });
    }

    // Generate a cryptographically secure 6-digit verification code
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Store or update the verification record in the database
    await db.insert(phoneVerifications)
      .values({
        phone: cleanedPhone,
        code: otpCode,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: phoneVerifications.phone,
        set: {
          code: otpCode,
          expiresAt,
        },
      });

    console.log(`[Signup OTP] Generated verification code for ${cleanedPhone}: ${otpCode}`);

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
          console.error(`[Signup OTP] Textbee API returned status ${response.status}: ${errText}`);
        } else {
          console.log(`[Signup OTP] SMS sent successfully via Textbee to ${recipient}`);
        }
      } catch (fetchErr) {
        console.error("[Signup OTP] Failed to send SMS via Textbee API:", fetchErr);
      }
    } else {
      console.warn("[Signup OTP] Textbee API credentials not found. SMS dispatch was bypassed.");
    }

    // Return success response. In development/testing environment, we include the code for convenience.
    const responseData: any = {
      success: true,
      message: "OTP sent successfully.",
    };

    if (process.env.NODE_ENV !== 'production') {
      responseData.code = otpCode;
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error in send-signup OTP endpoint:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
