import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";

const PostAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Announcement body is required"),
  targetRole: z.enum(["all", "ambulance_responder", "public_user"]).default("all"),
});

async function listAllAuthUsers() {
  const supabaseAdmin = createAdminClient();
  const authUsers: User[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error) throw error;
    authUsers.push(...(data.users ?? []));
    if (!data.users || data.users.length < 1_000) return authUsers;
    page += 1;
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authorize: Ensure caller is logged in and is an administrator
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    });

    if (!dbUser || (dbUser.role !== "pacc_admin" && dbUser.role !== "cdrrmo_super_admin")) {
      return NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 });
    }

    // 2. Validate input payload
    const bodyText = await req.json();
    const result = PostAnnouncementSchema.safeParse(bodyText);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { title, body, targetRole } = result.data;

    // 3. Query all users from auth utilizing Admin Client to check their notification preferences
    let authUsers;
    try {
      authUsers = await listAllAuthUsers();
    } catch (userFetchError) {
      console.error("[Announcement API] Failed to query auth users:", userFetchError);
      return NextResponse.json({ error: "Failed to query target users" }, { status: 500 });
    }

    // 4. Retrieve database users to filter roles
    let dbUsersList = await db.select().from(users).where(eq(users.status, "ACTIVE"));

    if (targetRole !== "all") {
      dbUsersList = dbUsersList.filter(u => u.role === targetRole);
    }

    const dbUserIds = new Set(dbUsersList.map(u => u.id));

    // `system_notices` is the legacy web preference key. Honour both it and
    // the canonical mobile `system` key so existing responders are not
    // silently excluded from a broadcast.
    const targetUsers = authUsers.filter((u) => {
      if (!dbUserIds.has(u.id)) return false;
      const prefs = u.user_metadata?.notification_preferences;
      return prefs?.system !== false && prefs?.system_notices !== false;
    });

    if (targetUsers.length === 0) {
      return NextResponse.json({ success: true, message: "No active users matched the announcement scope." });
    }

    // 5. Bulk dispatch system announcements into notifications table
    let dispatchedCount = 0;
    for (const targetUser of targetUsers) {
      const id = crypto.randomUUID();
      await db.insert(notifications).values({
        id,
        userId: targetUser.id,
        type: "system_announcement",
        title,
        body,
        unread: true,
        createdAt: new Date(),
        metadata: {
          senderId: user.id,
          scope: targetRole,
          category: "system_notice"
        }
      });
      dispatchedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `System announcement successfully broadcasted to ${dispatchedCount} users.`,
    });
  } catch (error: any) {
    console.error("[Announcement API] Broadcast failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
