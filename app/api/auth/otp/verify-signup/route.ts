import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { phoneVerifications } from "@/db/schema/phone_verifications";
import { eq } from "drizzle-orm";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code, otpCode } = body;
    const verificationCode = code || otpCode;

    if (!phone || !verificationCode) {
      return NextResponse.json({ error: "Phone number and OTP code are required." }, { status: 400 });
    }

    const cleanedPhone = sanitizePhone(phone);

    // Fetch the stored verification record for this phone number
    const record = await db.query.phoneVerifications.findFirst({
      where: eq(phoneVerifications.phone, cleanedPhone),
    });

    if (!record) {
      return NextResponse.json({ error: "No verification request found for this mobile number." }, { status: 404 });
    }

    // Verify code matches and is not expired
    if (record.code !== verificationCode) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP code has expired." }, { status: 400 });
    }

    // Successfully verified! Delete the OTP record to prevent replay attacks
    await db.delete(phoneVerifications)
      .where(eq(phoneVerifications.phone, cleanedPhone));

    console.log(`[Signup OTP] Successfully verified and cleared OTP for ${cleanedPhone}`);

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error: any) {
    console.error("Error in verify-signup OTP endpoint:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
