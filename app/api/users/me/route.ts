import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const roleSchema = z.object({
  role: z.enum(["public_user", "ambulance_responder"]),
});

export async function GET() {
  const supabaseClient = await createClient();
  const { data: { user }, error } = await supabaseClient.auth.getUser();

  if (error || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Attempt to get additional data from our DB
  let dbUser = null;
  try {
    const results = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    dbUser = results[0];
  } catch (err) {
    console.error("Database error fetching user:", err);
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: dbUser?.role || user.app_metadata?.role || 'public_user',
    verification_status: dbUser?.verificationStatus || 'approved',
    rejection_reason: dbUser?.rejectionReason,
  });
}

export async function POST(req: Request) {
  const supabaseClient = await createClient();
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const result = roleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { role } = result.data;
    
    // Update public.users table. The trigger 'on_user_role_sync' will handle syncing to auth.users JWT.
    await db.update(users)
      .set({ 
        role,
        verificationStatus: role === 'ambulance_responder' ? 'PENDING' : 'APPROVED',
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating user role:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
