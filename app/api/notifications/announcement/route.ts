import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase-server";
import { db } from "@/db";
import { notifications, systemBroadcasts, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { sendSystemAnnouncementPush } from "@/lib/push-notifications";
import { announcementDeliveryStatus } from '@/lib/announcement-delivery-status';

const PostAnnouncementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Title must be 160 characters or fewer"),
  body: z.string().trim().min(1, "Announcement body is required").max(2_000, "Announcement body must be 2,000 characters or fewer"),
  targetRole: z.enum(["all", "ambulance_responder", "public_user"]).default("all"),
  broadcastId: z.string().uuid().optional(),
});

function replayResponse(broadcast: typeof systemBroadcasts.$inferSelect, senderId: string, input: z.infer<typeof PostAnnouncementSchema>) {
  if (broadcast.senderId !== senderId || broadcast.title !== input.title || broadcast.body !== input.body || broadcast.targetRole !== input.targetRole) {
    return NextResponse.json({ error: 'This broadcast identifier has already been used for a different announcement.' }, { status: 409 });
  }
  return NextResponse.json({ success: true, replayed: true,
    broadcast: { ...broadcast, deliveryStatus: announcementDeliveryStatus(broadcast.pushFailureReason) },
    message: 'This announcement was already saved. No duplicate notifications were created.',
  });
}

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

async function requireAnnouncementAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  if (!dbUser || (dbUser.role !== "pacc_admin" && dbUser.role !== "cdrrmo_super_admin")) {
    return { error: NextResponse.json({ error: "Forbidden: Admin privileges required" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  try {
    const authorization = await requireAnnouncementAdmin();
    if (authorization.error) return authorization.error;
    const broadcasts = await db.query.systemBroadcasts.findMany({
      orderBy: [desc(systemBroadcasts.createdAt)],
      limit: 20,
    });
    return NextResponse.json({ broadcasts: broadcasts.map(broadcast => ({ ...broadcast, deliveryStatus: announcementDeliveryStatus(broadcast.pushFailureReason) })) });
  } catch (error) {
    console.error("[Announcement API] Failed to load broadcast history:", error);
    return NextResponse.json({ error: "Unable to load announcement history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authorize: Ensure caller is logged in and is an administrator
    const authorization = await requireAnnouncementAdmin();
    if (authorization.error) return authorization.error;
    const user = authorization.user;

    // 2. Validate input payload
    const bodyText = await req.json();
    const result = PostAnnouncementSchema.safeParse(bodyText);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const { title, body, targetRole } = result.data;
    const broadcastId = result.data.broadcastId ?? crypto.randomUUID();
    const existing = await db.query.systemBroadcasts.findFirst({ where: eq(systemBroadcasts.id, broadcastId) });
    if (existing) return replayResponse(existing, user.id, result.data);

    // Read Auth metadata once for the existing opt-out preference. The
    // database user row remains the authoritative account/role record.
    let authUsers;
    try {
      authUsers = await listAllAuthUsers();
    } catch (userFetchError) {
      console.error("[Announcement API] Failed to query auth users:", userFetchError);
      return NextResponse.json({ error: "Failed to query target users" }, { status: 500 });
    }

    // An account must be active to receive a system notice. This preserves the
    // prior access policy while making inactive exclusions observable to admins.
    const scopedAccounts = (await db.select().from(users)).filter((account) =>
      targetRole === "all" || account.role === targetRole,
    );
    const activeAccounts = scopedAccounts.filter((account) => account.status === "ACTIVE");
    const authUserById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
    const activeWithAuth = activeAccounts.filter((account) => authUserById.has(account.id));
    const optedOutAccounts = activeWithAuth.filter((account) => {
      const prefs = authUserById.get(account.id)?.user_metadata?.notification_preferences;
      // `system_notices` is the legacy web preference key. Honour both it and
      // the canonical mobile `system` key so existing accounts stay consistent.
      return prefs?.system === false || prefs?.system_notices === false;
    });
    const optedOutIds = new Set(optedOutAccounts.map((account) => account.id));
    const recipients = activeWithAuth.filter((account) => !optedOutIds.has(account.id));
    const createdAt = new Date();

    // Persist the audit row and every recipient inbox entry together. A failed
    // insert can never produce a misleading partial "sent" success response.
    const inserted = await db.transaction(async (tx) => {
      const [broadcast] = await tx.insert(systemBroadcasts).values({
        id: broadcastId,
        senderId: user.id,
        title,
        body,
        targetRole,
        eligibleCount: recipients.length,
        persistedCount: recipients.length,
        optedOutCount: optedOutAccounts.length,
        inactiveCount: scopedAccounts.length - activeAccounts.length,
        missingAuthCount: activeAccounts.length - activeWithAuth.length,
        createdAt,
        pushFailureReason: { deliveryStatus: 'pending' },
      }).onConflictDoNothing({ target: systemBroadcasts.id }).returning();
      if (!broadcast) return false;

      if (recipients.length > 0) {
        await tx.insert(notifications).values(recipients.map((recipient) => ({
          id: crypto.randomUUID(),
          userId: recipient.id,
          broadcastId,
          type: "system_announcement",
          title,
          body,
          unread: true,
          createdAt,
          metadata: {
            senderId: user.id,
            scope: targetRole,
            category: "system_notice",
            broadcastId,
          },
        })));
      }
      return true;
    });
    if (!inserted) {
      const previous = await db.query.systemBroadcasts.findFirst({ where: eq(systemBroadcasts.id, broadcastId) });
      if (!previous) throw new Error('Unable to recover the saved broadcast. Retry with the same identifier.');
      return replayResponse(previous, user.id, result.data);
    }

    // Push is advisory and starts only after the inbox is committed. Limit
    // provider fan-out so a large audience does not create an unbounded burst.
    const pushResults: Awaited<ReturnType<typeof sendSystemAnnouncementPush>>[] = [];
    for (let index = 0; index < recipients.length; index += 20) {
      const batch = recipients.slice(index, index + 20);
      const batchResults = await Promise.allSettled(batch.map((recipient) => sendSystemAnnouncementPush({
        userId: recipient.id,
        title,
        body,
        broadcastId,
      })));
      for (const result of batchResults) {
        pushResults.push(result.status === "fulfilled"
          ? result.value
          : { eligible: true, accepted: false, reason: "delivery_error" });
      }
    }
    const pushEligibleCount = pushResults.filter((result) => result.eligible).length;
    const pushAcceptedCount = pushResults.filter((result) => result.accepted).length;
    const pushFailures = pushResults.filter((result) => !result.accepted && result.eligible);
    const pushFailureReason = pushFailures.length > 0
      ? pushFailures.reduce<Record<string, number>>((counts, result) => {
          const reason = "reason" in result ? result.reason : "delivery_error";
          counts[reason] = (counts[reason] ?? 0) + 1;
          return counts;
        }, {})
      : null;

    let deliveryStatus: 'complete' | 'incomplete' = 'complete';
    try {
    await db.update(systemBroadcasts).set({
      pushEligibleCount,
      pushAcceptedCount,
      pushFailedCount: pushFailures.length,
      pushFailureReason,
    }).where(eq(systemBroadcasts.id, broadcastId));
    } catch (error) {
      deliveryStatus = 'incomplete';
      console.error('[Announcement API] Inbox saved; delivery accounting incomplete:', { broadcastId, error });
    }

    return NextResponse.json({
      success: true,
      broadcast: {
        id: broadcastId,
        title,
        body,
        targetRole,
        createdAt: createdAt.toISOString(),
        eligibleCount: recipients.length,
        persistedCount: recipients.length,
        optedOutCount: optedOutAccounts.length,
        inactiveCount: scopedAccounts.length - activeAccounts.length,
        missingAuthCount: activeAccounts.length - activeWithAuth.length,
        pushEligibleCount,
        pushAcceptedCount,
        pushFailedCount: pushFailures.length,
        deliveryStatus,
      },
      message: recipients.length > 0
        ? `Announcement saved for ${recipients.length} eligible account${recipients.length === 1 ? "" : "s"}.`
        : "Announcement saved, but no active recipients matched the selected audience.",
    });
  } catch (error) {
    console.error("[Announcement API] Broadcast failed:", error);
    return NextResponse.json({ error: 'Unable to confirm the broadcast. Retry the same announcement to check whether it was saved.' }, { status: 500 });
  }
}
