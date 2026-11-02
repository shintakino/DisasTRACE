import * as dotenv from 'dotenv';
import { and, eq, inArray, isNull, lt, or } from 'drizzle-orm';

dotenv.config({ path: '.env.local', quiet: true });

async function main() {
  const apply = process.argv.includes('--apply');
  const { db } = await import('../db');
  const { incidents, users } = await import('../db/schema');
  const freshAfter = new Date(Date.now() - 90_000);

  const result = await db.transaction(async tx => {
    const staleResponders = await tx.select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.role, 'ambulance_responder'),
        eq(users.status, 'ACTIVE'),
        eq(users.verificationStatus, 'APPROVED'),
        eq(users.dutyStatus, 'ON_DUTY'),
        or(isNull(users.lastLocationUpdatedAt), lt(users.lastLocationUpdatedAt, freshAfter)),
      ))
      .for('update');

    let reset = 0;
    let protectedByActiveIncident = 0;
    for (const responder of staleResponders) {
      const activeIncident = await tx.query.incidents.findFirst({
        where: and(
          inArray(incidents.status, ['DISPATCHED', 'EN_ROUTE', 'ARRIVED']),
          or(eq(incidents.responderId, responder.id), eq(incidents.currentOfferResponderId, responder.id)),
        ),
        columns: { id: true },
      });
      if (activeIncident) {
        protectedByActiveIncident += 1;
        continue;
      }
      if (!apply) continue;
      const updated = await tx.update(users)
        .set({ dutyStatus: 'OFF_DUTY', updatedAt: new Date() })
        .where(and(eq(users.id, responder.id), eq(users.dutyStatus, 'ON_DUTY'),
          or(isNull(users.lastLocationUpdatedAt), lt(users.lastLocationUpdatedAt, freshAfter))))
        .returning({ id: users.id });
      reset += updated.length;
    }

    return {
      mode: apply ? 'applied' : 'dry_run',
      staleOnDutyWithoutActiveIncident: staleResponders.length - protectedByActiveIncident,
      protectedByActiveIncident,
      reset,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

void main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error('Stale duty cleanup failed; no rows were changed unless the transaction committed.', error instanceof Error ? error.message : 'Unknown error.');
  process.exit(1);
});
