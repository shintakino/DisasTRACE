import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit_logs";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.app_metadata?.role !== 'cdrrmo_super_admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'The global audit trail is available to CDRRMO Super Admins only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.toLowerCase();
    const role = searchParams.get("role");

    // Query real audit logs from the database
    const queryBuilder = db
      .select({
        id: auditLogs.id,
        userName: users.fullName,
        actorName: auditLogs.actorName,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id));

    const dbLogs = await queryBuilder.orderBy(desc(auditLogs.createdAt)).limit(200);

    let mapped = dbLogs.map((log) => ({
      id: log.id,
      userName: log.actorName ?? log.userName ?? 'Former system user',
      actorRole: log.actorRole ?? 'unknown',
      action: log.action,
      contextPath: `System > ${log.entityType || "Generic"} Operations`,
      entityId: log.entityId,
      details: log.details && typeof log.details === 'object' ? log.details as Record<string, unknown> : {},
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

    if (role && role !== 'all') {
      mapped = mapped.filter((log) => log.actorRole === role);
    }

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

