import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit_logs";
import { users } from "@/db/schema/users";
import { eq, desc, or, like } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.toLowerCase();
    const role = searchParams.get("role");

    // Query real audit logs from the database
    const queryBuilder = db
      .select({
        id: auditLogs.id,
        userName: users.fullName,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id));

    if (role && role !== "all") {
      queryBuilder.where(eq(users.role, role as any));
    }

    const dbLogs = await queryBuilder.orderBy(desc(auditLogs.createdAt));

    let mapped = dbLogs.map((log) => ({
      id: log.id,
      userName: log.userName,
      action: log.action,
      contextPath: `System > ${log.entityType || "Generic"} Operations`,
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
    }));

    if (query) {
      mapped = mapped.filter(
        (log) =>
          log.userName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query)
      );
    }

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error in GET /api/audit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

