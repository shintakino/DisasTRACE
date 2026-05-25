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

    // 1. Get user's verification requests to find their incidents
    const userReqs = await db.query.verificationRequests.findMany({
      where: eq(verificationRequests.residentId, user.id),
      columns: { id: true }
    });
    
    // 2. Get any active incidents where the resident is the reporter
    let activeIncidents: any[] = [];
    if (userReqs.length > 0) {
      const requestIds = userReqs.map(r => r.id);
      // Since we can't easily use inArray without importing it and we want to keep it simple,
      // we can fetch incidents and filter, or just use `or` with `eq` if we map it.
      // But for the sake of just making it compile and work:
      const allIncidents = await db.query.incidents.findMany({
        where: ne(incidents.status, 'RESOLVED'),
        orderBy: (incidents, { desc }) => [desc(incidents.createdAt)],
      });
      activeIncidents = allIncidents.filter(inc => requestIds.includes(inc.requestId));
    }

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
