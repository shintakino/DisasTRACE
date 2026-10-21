import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function expectIncludes(content: string, expected: string, label: string) {
  if (!content.includes(expected)) throw new Error(`${label}: missing ${expected}`);
}

const announcementRoute = source('app/api/notifications/announcement/route.ts');
const pushServer = source('lib/push-notifications.ts');
const pushTokenRoute = source('app/api/mobile-push-tokens/route.ts');
const mobileRoot = source('mobile/app/_layout.tsx');
const dashboard = source('app/(dashboard)/announcements/page.tsx');
const migration = source('drizzle/0035_uneven_firedrake.sql');

expectIncludes(announcementRoute, 'await db.transaction', 'announcement persistence');
expectIncludes(announcementRoute, 'tx.insert(systemBroadcasts)', 'broadcast audit');
expectIncludes(announcementRoute, 'broadcastId,', 'recipient linkage');
expectIncludes(announcementRoute, 'sendSystemAnnouncementPush', 'advisory push delivery');
expectIncludes(announcementRoute, 'optedOutCount', 'recipient accounting');
expectIncludes(announcementRoute, 'export async function GET()', 'broadcast history API');
expectIncludes(pushServer, 'sendSystemAnnouncementPush', 'server announcement push');
expectIncludes(pushTokenRoute, "dbUser?.role === 'public_user'", 'public push-token authorization');
expectIncludes(mobileRoot, 'useMobilePushRegistration(', 'public mobile token registration');
expectIncludes(source('mobile/hooks/use-mobile-push-registration.ts'), 'retryLater', 'failed registration recovery');
expectIncludes(source('mobile/lib/push-notifications.ts'), 'devicePushToken: token', 'native-to-Expo token exchange');
expectIncludes(dashboard, 'Saved to {b.persistedCount}', 'real dashboard delivery count');
if (dashboard.includes('dispatchedCount: targetRole ===')) throw new Error('dashboard still fabricates broadcast counts');
expectIncludes(migration, 'CREATE TABLE "system_broadcasts"', 'broadcast migration');
expectIncludes(migration, '"broadcast_id"', 'notification broadcast link migration');

console.log('Announcement delivery regression checks passed.');
