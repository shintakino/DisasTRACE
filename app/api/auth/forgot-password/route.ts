import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { createAdminClient } from "@/lib/supabase-server";
import { z } from "zod";

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  employeeId: z.string().min(1, "Employee ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = ForgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "No administrative account matches the provided Email and Employee ID." },
        { status: 404 }
      );
    }

    const { email, employeeId } = result.data;
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedEmployeeId = employeeId.trim();

    // 1. Verify that user exists with both email and employee ID, and has an administrative role
    const userRecord = await db.query.users.findFirst({
      where: (users, { eq, and, or }) => and(
        eq(users.email, sanitizedEmail),
        eq(users.employeeId, sanitizedEmployeeId),
        or(
          eq(users.role, "cdrrmo_super_admin"),
          eq(users.role, "pacc_admin")
        )
      ),
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "No administrative account matches the provided Email and Employee ID." },
        { status: 404 }
      );
    }

    // 2. Initialize the Supabase Service Role client to trigger the password reset flow
    const supabaseAdmin = createAdminClient();
    
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      sanitizedEmail,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_API_URL}/reset-password`,
      }
    );

    if (resetError) {
      console.error("Supabase resetPasswordForEmail error:", resetError);
      return NextResponse.json(
        { error: resetError.message || "Failed to trigger password recovery. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset link sent successfully.",
    });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
