import * as dotenv from 'dotenv';
import { and, count, desc, eq } from 'drizzle-orm';

// Read-only aggregates; never prints names, account IDs, tokens, or message content.
dotenv.config({ path: '.env.local', quiet: true });

async function main() {
  const { db } = await import('../db');
  const { users, notifications, mobilePushTokens, mobileDeviceSessions, systemBroadcasts } = await import('../db/schema');
  const accounts = await db.select({ role: users.role, status: users.status, verification: users.verificationStatus, count: count() })
    .from(users).groupBy(users.role, users.status, users.verificationStatus);
  const boundDevices = await db.select({ role: users.role, count: count() }).from(mobilePushTokens)
    .innerJoin(users, eq(users.id, mobilePushTokens.userId))
    .innerJoin(mobileDeviceSessions, and(eq(mobileDeviceSessions.userId, users.id), eq(mobileDeviceSessions.activeSessionId, mobilePushTokens.sessionId)))
    .groupBy(users.role);
  const broadcasts = await db.select({ createdAt: systemBroadcasts.createdAt, audience: systemBroadcasts.targetRole,
    inboxes: systemBroadcasts.persistedCount, optedOut: systemBroadcasts.optedOutCount, inactive: systemBroadcasts.inactiveCount,
    missingAuth: systemBroadcasts.missingAuthCount, pushEligible: systemBroadcasts.pushEligibleCount,
    pushAccepted: systemBroadcasts.pushAcceptedCount, pushFailed: systemBroadcasts.pushFailedCount,
  }).from(systemBroadcasts).orderBy(desc(systemBroadcasts.createdAt)).limit(10);
  const inboxAudience = await db.select({ role: users.role, count: count() }).from(notifications)
    .innerJoin(users, eq(users.id, notifications.userId))
    .innerJoin(systemBroadcasts, eq(systemBroadcasts.id, notifications.broadcastId))
    .groupBy(users.role);
  console.log(JSON.stringify({ accounts, boundDevices, persistedAnnouncementInboxesByRole: inboxAudience, recentBroadcastDelivery: broadcasts }, null, 2));
}
void main().then(() => process.exit(0)).catch(() => {
  console.error('Announcement readiness inspection failed. Check database connectivity and the announcement schema; no data was changed.');
  process.exit(1);
});
