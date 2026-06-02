import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, or } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Strip non-digits and non-plus
    const sanitizedPhone = phone.replace(/[^\d+]/g, '');

    // Format queries
    let query1 = sanitizedPhone;
    let query2 = sanitizedPhone;
    
    // Normalize formats (e.g. 0917... vs +63917...)
    if (sanitizedPhone.startsWith('09') && sanitizedPhone.length === 11) {
      query1 = sanitizedPhone; // 09XXXXXXXXX
      query2 = '+63' + sanitizedPhone.substring(1); // +63XXXXXXXXX
    } else if (sanitizedPhone.startsWith('+639') && sanitizedPhone.length === 13) {
      query1 = '0' + sanitizedPhone.substring(3); // 09XXXXXXXXX
      query2 = sanitizedPhone; // +639XXXXXXXXX
    } else if (sanitizedPhone.startsWith('639') && sanitizedPhone.length === 12) {
      query1 = '0' + sanitizedPhone.substring(2); // 09XXXXXXXXX
      query2 = '+' + sanitizedPhone; // +639XXXXXXXXX
    }

    const matchedUser = await db.query.users.findFirst({
      where: or(
        eq(users.phone, query1),
        eq(users.phone, query2),
        eq(users.phone, phone)
      )
    });

    if (!matchedUser) {
      return NextResponse.json({ 
        error: "No account found associated with this mobile number." 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      email: matchedUser.email 
    });
  } catch (err: any) {
    console.error("Error resolving phone number to email:", err);
    return NextResponse.json({ 
      error: err.message || "Internal Server Error" 
    }, { status: 500 });
  }
}
