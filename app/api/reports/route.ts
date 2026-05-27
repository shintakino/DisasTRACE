import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema/reports";
import { incidents } from "@/db/schema/incidents";
import { verificationRequests } from "@/db/schema/verification_requests";
import { users } from "@/db/schema/users";
import { eq, and, or, like, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

const SubmitReportSchema = z.object({
  incidentId: z.string().uuid(),
  description: z.string().optional(),
  scenePhotos: z.array(z.string()).optional(),
  participants: z.array(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();
    const type = searchParams.get("type");
    const status = searchParams.get("status");

    // Fetch reports by joining Drizzle schema tables
    const dbReports = await db
      .select({
        id: reports.id,
        responderName: users.fullName,
        type: verificationRequests.type,
        status: reports.status,
        createdAt: reports.createdAt,
        location: verificationRequests.locationDescription,
      })
      .from(reports)
      .innerJoin(incidents, eq(reports.incidentId, incidents.id))
      .innerJoin(verificationRequests, eq(incidents.requestId, verificationRequests.id))
      .innerJoin(users, eq(reports.responderId, users.id))
      .orderBy(desc(reports.createdAt));

    let filtered = [...dbReports].map((r) => ({
      id: r.id,
      responderName: r.responderName,
      type: r.type,
      status: r.status === 'SUBMITTED' ? 'COMPLETED' : 'ONGOING',
      date: new Date(r.createdAt).toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: new Date(r.createdAt).toLocaleTimeString("en-US", {
        hour: '2-digit',
        minute: '2-digit'
      }),
      location: r.location || "Baliwag City",
    }));

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.responderName.toLowerCase().includes(search) ||
          r.type.toLowerCase().includes(search) ||
          r.id.toLowerCase().includes(search)
      );
    }

    if (type) {
      filtered = filtered.filter((r) => r.type === type);
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  } catch (error) {
    console.error("Error in GET /api/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = SubmitReportSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { incidentId, description, scenePhotos, participants } = result.data;

    // 1. Fetch incident to verify details
    const incident = await db.query.incidents.findFirst({
      where: eq(incidents.id, incidentId),
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Generate unique Report ID
    const year = new Date().getFullYear();
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const reportId = `REP-${year}-${randNum}`;

    // 2. Insert into reports table
    const [newReport] = await db.insert(reports).values({
      id: reportId,
      incidentId,
      responderId: user.id,
      status: "SUBMITTED",
      description: description || "No additional logs provided.",
      scenePhotos: scenePhotos || [],
      participants: participants || [],
    }).returning();

    // 3. Update parent incident to RESOLVED and set resolvedAt
    await db.update(incidents)
      .set({
        status: "RESOLVED",
        resolvedAt: new Date(),
      })
      .where(eq(incidents.id, incidentId));

    // 4. Reset responder status back to ON_DUTY so they become available for new dispatches
    await db.update(users)
      .set({ dutyStatus: "ON_DUTY" })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      report: newReport,
      message: "Incident report successfully submitted. Incident resolved."
    });
  } catch (error) {
    console.error("Error in POST /api/reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
