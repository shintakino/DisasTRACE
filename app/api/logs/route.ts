import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { statusLogs } from "@/db/schema/status_logs";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const supabaseClient = await createClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const role = user?.app_metadata?.role;

    if (role !== "cdrrmo_super_admin" && role !== "pacc_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search")?.toLowerCase();
    const status = searchParams.get("status");

    // Query active status logs from the database
    const dbLogs = await db
      .select({
        id: statusLogs.id,
        createdAt: statusLogs.createdAt,
        responderName: users.fullName,
        description: statusLogs.description,
        status: statusLogs.status,
        action: statusLogs.action,
      })
      .from(statusLogs)
      .innerJoin(users, eq(statusLogs.userId, users.id))
      .orderBy(desc(statusLogs.createdAt));

    let filtered = dbLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      date: new Date(log.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: new Date(log.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      responderName: log.responderName,
      logDescription: log.description,
      status: log.status,
      action: log.action,
    }));

    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.responderName.toLowerCase().includes(search) ||
          l.logDescription.toLowerCase().includes(search)
      );
    }

    if (status && status !== "all") {
      filtered = filtered.filter((l) => l.status === status);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error in GET /api/logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

