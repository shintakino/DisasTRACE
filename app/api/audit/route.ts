import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit_logs";
import { users } from "@/db/schema/users";
import { eq, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase-server";
import { z } from "zod";

const AuditLimitSchema = z.coerce.number().int().min(1).max(200).optional();

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
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const parsedLimit = AuditLimitSchema.safeParse(searchParams.get("limit") ?? undefined);
    if (!parsedLimit.success) {
      return NextResponse.json({ error: 'Audit log limit must be between 1 and 200.' }, { status: 400 });
    }

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

    const dbLogs = await queryBuilder.orderBy(desc(auditLogs.createdAt)).limit(parsedLimit.data ?? 200);

    let mapped = dbLogs.map((log) => ({
      id: log.id,
      userName: log.actorName ?? log.userName ?? 'Former system user',
      actorName: log.actorName ?? log.userName ?? 'Former system user',
      actorRole: log.actorRole ?? 'unknown',
      action: log.action,
      entityType: log.entityType || 'Generic',
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
          log.action.toLowerCase().includes(query) ||
          log.contextPath.toLowerCase().includes(query) ||
          log.actorRole.toLowerCase().includes(query)
      );
    }

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      mapped = mapped.filter((log) => new Date(log.timestamp) >= fromDate);
    }
    if (toDate && !Number.isNaN(toDate.getTime())) {
      mapped = mapped.filter((log) => new Date(log.timestamp) <= toDate);
    }

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error in GET /api/audit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

