import * as dotenv from 'dotenv';
import { and, count, eq, isNotNull, ne, or } from 'drizzle-orm';
dotenv.config({ path: '.env.local', quiet: true });

async function main() {
  const { db } = await import('../db');
  const { verificationRequests: requests, incidents, reports } = await import('../db/schema');
  const totals = await db.select({ request: requests.status, incident: incidents.status, report: reports.status, count: count() })
    .from(requests).leftJoin(incidents, eq(incidents.requestId, requests.id)).leftJoin(reports, eq(reports.incidentId, incidents.id))
    .groupBy(requests.status, incidents.status, reports.status);
  const mismatches = await db.select({ requestId: requests.requestId, requestStatus: requests.status,
    incidentStatus: incidents.status, reportStatus: reports.status, reportCreatedAt: reports.createdAt,
  }).from(requests).leftJoin(incidents, eq(incidents.requestId, requests.id)).leftJoin(reports, eq(reports.incidentId, incidents.id))
    .where(or(and(eq(reports.status, 'SUBMITTED'), ne(incidents.status, 'RESOLVED')),
      and(eq(incidents.status, 'RESOLVED'), eq(requests.status, 'PENDING')),
      and(eq(requests.status, 'PENDING'), isNotNull(incidents.id))))
    .limit(30);
  console.log(JSON.stringify({ totals, mismatches }, null, 2));
}
void main().then(() => process.exit(0)).catch(() => {
  console.error('Read-only lifecycle inspection failed; no data was changed.');
  process.exit(1);
});
