import type { db } from '@/db';
import { and, eq, inArray, or } from 'drizzle-orm';
import { incidents, users } from '@/db/schema';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Lock availability before reading current work, so a stale cleanup cannot release a newer offer. */
export async function releaseResponderAvailability(tx: Transaction, responderId: string) {
  const [responder] = await tx.select({ id: users.id, dutyStatus: users.dutyStatus })
    .from(users).where(eq(users.id, responderId)).for('update');
  if (!responder) throw new Error('Responder no longer exists.');
  const otherActiveIncident = await tx.query.incidents.findFirst({
    where: and(
      inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']),
      or(eq(incidents.responderId, responderId), eq(incidents.currentOfferResponderId, responderId)),
    ), columns: { id: true },
  });
  if (otherActiveIncident) {
    if (responder.dutyStatus !== 'ACTIVE_DISPATCH') {
      await tx.update(users).set({ dutyStatus: 'ACTIVE_DISPATCH' }).where(eq(users.id, responderId));
    }
    return { dutyStatus: 'ACTIVE_DISPATCH' as const, released: false };
  }
  if (responder.dutyStatus !== 'ACTIVE_DISPATCH') return { dutyStatus: responder.dutyStatus, released: false };
  await tx.update(users).set({ dutyStatus: 'ON_DUTY' }).where(and(eq(users.id, responderId), eq(users.dutyStatus, 'ACTIVE_DISPATCH')));
  return { dutyStatus: 'ON_DUTY' as const, released: true };
}
