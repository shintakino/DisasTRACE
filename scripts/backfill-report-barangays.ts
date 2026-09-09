import * as dotenv from 'dotenv';
import { and, asc, eq, gt, isNotNull, isNull, or } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function main() {
  const [{ db }, { verificationRequests }, { resolveBaliwagBarangay }] = await Promise.all([
    import('../db'),
    import('../db/schema/verification_requests'),
    import('../lib/barangay-boundaries'),
  ]);

  const batchSize = 250;
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;
  let outsideServiceArea = 0;

  while (true) {
    const where = cursor
      ? and(
        gt(verificationRequests.id, cursor),
        isNotNull(verificationRequests.latitude),
        isNotNull(verificationRequests.longitude),
        or(isNull(verificationRequests.barangay), isNull(verificationRequests.barangayPsgcCode)),
      )
      : and(
        isNotNull(verificationRequests.latitude),
        isNotNull(verificationRequests.longitude),
        or(isNull(verificationRequests.barangay), isNull(verificationRequests.barangayPsgcCode)),
      );
    const rows = await db
      .select({
        id: verificationRequests.id,
        latitude: verificationRequests.latitude,
        longitude: verificationRequests.longitude,
      })
      .from(verificationRequests)
      .where(where)
      .orderBy(asc(verificationRequests.id))
      .limit(batchSize);

    if (rows.length === 0) break;
    scanned += rows.length;

    for (const row of rows) {
      const barangay = resolveBaliwagBarangay(row.latitude, row.longitude);
      if (!barangay) {
        outsideServiceArea += 1;
        continue;
      }
      await db
        .update(verificationRequests)
        .set({ barangay: barangay.name, barangayPsgcCode: barangay.psgcCode })
        .where(eq(verificationRequests.id, row.id));
      updated += 1;
    }

    cursor = rows[rows.length - 1]?.id;
  }

  console.log(`Barangay backfill complete: scanned=${scanned}, updated=${updated}, outsideServiceArea=${outsideServiceArea}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Barangay backfill failed:', error);
    process.exit(1);
  });
