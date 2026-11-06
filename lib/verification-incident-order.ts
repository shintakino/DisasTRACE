import { asc, desc, sql } from 'drizzle-orm';
import { incidents } from '@/db/schema/incidents';

// Legacy requests can have several incidents. Read the same incident for
// queue display and locked decisions, so a closed response cannot reappear
// as actionable depending on database row order.
export function verificationIncidentOrder() {
  return [
    asc(sql`case when ${incidents.status} = 'RESOLVED' then 0 when ${incidents.status} = 'DOCUMENTATION_PENDING' then 1 else 2 end`),
    desc(incidents.createdAt),
    desc(incidents.id),
  ];
}
