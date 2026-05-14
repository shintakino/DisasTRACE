import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const roleSchema = z.object({
  role: z.enum(["public_user", "ambulance_responder"]),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Attempt to get additional data from our DB
  let dbUser = null;
  try {
    const results = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    dbUser = results[0];
  } catch (error) {
    console.error("Database error fetching user:", error);
  }

  return NextResponse.json({
    id: user.id,
    email: user.emailAddresses[0].emailAddress,
    role: dbUser?.role || user.publicMetadata.role || 'public_user',
    verification_status: dbUser?.verificationStatus || user.publicMetadata.verification_status || 'approved',
    rejection_reason: dbUser?.rejectionReason || user.publicMetadata.rejection_reason,
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const result = roleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { role } = result.data;
    const client = await clerkClient();
    
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role,
        // New users default to pending for responders, approved for residents (for MVP simplicity)
        // or whatever the business logic dictates. 
        // Spec 15 says responders need approval.
        verification_status: role === 'ambulance_responder' ? 'pending' : 'approved',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user metadata:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
