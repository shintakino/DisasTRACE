import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq, and, gte, inArray, sql } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.app_metadata?.role !== 'cdrrmo_super_admin') {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  // Fetch pending applicants
  const pendingUsers = await db
    .select()
    .from(users)
    .where(eq(users.verificationStatus, 'PENDING'));

  // Generate short-lived signed URLs (e.g., 60 seconds expiry)
  const applicants = await Promise.all(
    pendingUsers.map(async (u) => {
      let signedUrl = "";
      if (u.idImageUrl) {
        const { data } = await supabase.storage
          .from('user-ids')
          .createSignedUrl(u.idImageUrl, 60);
        signedUrl = data?.signedUrl || "";
      }

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        address: u.address,
        roleRequested: u.role,
        status: u.verificationStatus,
        identityDocument: {
          type: u.idType || "Unknown",
          imageUrl: signedUrl,
          uploadedAt: u.createdAt.toISOString(),
        },
        registeredAt: u.createdAt.toISOString(),
      };
    })
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [reviewedTodayResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(
      and(
        inArray(users.verificationStatus, ['APPROVED', 'REJECTED']),
        gte(users.updatedAt, todayStart)
      )
    );

  const reviewedToday = Number(reviewedTodayResult?.count || 0);

  return NextResponse.json({
    applicants,
    summary: {
      pending: applicants.length,
      reviewedToday,
    }
  });
}
