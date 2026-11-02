import * as dotenv from 'dotenv';
import { and, count, eq, or, sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local', quiet: true });

async function main() {
  const { db } = await import('../db');
  const { incidents, users } = await import('../db/schema');
  const now = new Date();
  const freshAfter = new Date(now.getTime() - 90_000);
  const activeIncidentRows = await db.select({
    status: incidents.status,
    dispatchMethod: incidents.dispatchMethod,
    responderId: incidents.responderId,
    currentOfferResponderId: incidents.currentOfferResponderId,
    offerExpiresAt: incidents.offerExpiresAt,
  }).from(incidents).where(sql`${incidents.status} in ('DISPATCHED', 'EN_ROUTE', 'ARRIVED')`);
  const activeDispatches = activeIncidentRows.reduce<Record<string, number>>((totals, row) => {
    const offerState = !row.currentOfferResponderId && !row.responderId ? 'UNASSIGNED'
      : row.currentOfferResponderId && row.offerExpiresAt && row.offerExpiresAt <= now ? 'EXPIRED_OFFER'
        : row.currentOfferResponderId ? 'OFFERED' : row.responderId ? 'ACCEPTED' : 'OTHER';
    const key = `${row.status}:${row.dispatchMethod ?? 'UNKNOWN'}:${offerState}`;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});

  const responderRows = await db.select({ dutyStatus: users.dutyStatus, lastLocationUpdatedAt: users.lastLocationUpdatedAt })
    .from(users).where(and(eq(users.role, 'ambulance_responder'), eq(users.status, 'ACTIVE'), eq(users.verificationStatus, 'APPROVED')));
  const responderDuty = responderRows.reduce<Record<string, number>>((totals, row) => {
    const heartbeatState = !row.lastLocationUpdatedAt ? 'MISSING' : row.lastLocationUpdatedAt < freshAfter ? 'STALE' : 'FRESH';
    const key = `${row.dutyStatus}:${heartbeatState}`;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});

  const responderAssignments = await db.select({
    dutyStatus: users.dutyStatus,
    activeCount: count(incidents.id),
  }).from(users).leftJoin(incidents, and(
    or(eq(incidents.responderId, users.id), eq(incidents.currentOfferResponderId, users.id)),
    sql`${incidents.status} in ('DISPATCHED', 'EN_ROUTE', 'ARRIVED')`,
  )).where(and(eq(users.role, 'ambulance_responder'), eq(users.status, 'ACTIVE'), eq(users.verificationStatus, 'APPROVED')))
    .groupBy(users.id, users.dutyStatus);

  const activeAssignments = responderAssignments.reduce<Record<string, number>>((totals, row) => {
    const assignmentState = row.activeCount === 0 ? 'NONE' : row.activeCount === 1 ? 'ONE' : 'MULTIPLE';
    const key = `${row.dutyStatus}:${assignmentState}`;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});

  console.log(JSON.stringify({ checkedAt: now.toISOString(), activeDispatches, responderDuty, activeAssignments }, null, 2));
}

void main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error('Read-only dispatch state inspection failed; no data was changed.', error instanceof Error ? error.message : 'Unknown error.');
  process.exit(1);
});
