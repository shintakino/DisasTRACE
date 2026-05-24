import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { createClient } from "@/lib/supabase-server";
import { eq, or, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get any active incidents where the resident is the reporter
    const activeIncidents = await db.query.incidents.findMany({
      where: and(
        eq(incidents.reportedBy, user.id),
        ne(incidents.status, 'RESOLVED'),
        ne(incidents.status, 'CLOSED')
      ),
      orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
      limit: 1
    });

    // 2. Get any pending verification requests for this resident
    const pendingVerifications = await db.query.verificationRequests.findMany({
      where: and(
        eq(verificationRequests.residentId, user.id),
        eq(verificationRequests.status, 'PENDING')
      ),
      orderBy: (verificationRequests, { desc }) => [desc(verificationRequests.createdAt)],
      limit: 1
    });

    return NextResponse.json({
      activeIncident: activeIncidents[0] || null,
      pendingVerification: pendingVerifications[0] || null,
    });

  } catch (error) {
    console.error('Error fetching active incidents:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
