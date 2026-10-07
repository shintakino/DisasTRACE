import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatManilaMobileDateTime, formatManilaMobileTime, manilaCalendarDateBounds } from '../mobile/lib/manila-presentation';

const source = (file: string) => readFileSync(file, 'utf8');
const instant = '2026-10-01T06:05:23.000Z';
const expectedMobileValue = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
}).format(new Date(instant));

assert.equal(formatManilaMobileDateTime(instant), expectedMobileValue);
assert.equal(formatManilaMobileTime(instant), '2:05 PM');
assert.equal(formatManilaMobileDateTime('not-a-timestamp'), null);
assert.deepEqual(
  manilaCalendarDateBounds(1, new Date('2026-10-01T18:00:00.000Z')),
  { createdAfter: '2026-10-01T16:00:00.000Z', createdBefore: '2026-10-02T16:00:00.000Z' },
);

const reportDetailRoute = source('app/api/reports/[id]/route.ts');
assert.match(reportDetailRoute, /eq\(statusLogs\.incidentId, r\.incidentId\)/);
assert.match(reportDetailRoute, /timelineEntry\("Incident Dispatched", dispatchedAt\)/);
assert.match(reportDetailRoute, /timelineEntry\("Ambulance Arrived at Scene", arrivedAt\)/);
assert.match(reportDetailRoute, /timelineEntry\("Report Logs Submitted", r\.createdAt\)/);
assert.match(reportDetailRoute, /occurredAt: occurredAt\?\.toISOString\(\) \?\? null/);
assert.match(reportDetailRoute, /time: occurredAt \? formatManilaTime\(occurredAt\) : "Not recorded"/);
assert.doesNotMatch(reportDetailRoute, /Ambulance Arrived at Scene", time: formatManilaTime\(r\.createdAt\)/);

const migration = source('drizzle/0034_elite_menace.sql');
assert.match(migration, /USING "created_at" AT TIME ZONE 'UTC'/);
assert.match(migration, /ALTER TABLE "status_logs" ADD COLUMN "incident_id"/);
assert.match(migration, /new\.id,\s*\n\s*'DISPATCHED'/);
assert.match(migration, /new\.id,\s*\n\s*'ON-SCENE'/);

const notifications = source('mobile/app/notifications.tsx');
assert.match(notifications, /formatManilaMobileDateTime/);
assert.doesNotMatch(notifications, /return d\.toLocaleDateString/);

const incidentDetail = source('mobile/app/(tabs)/reports/[id].tsx');
assert.match(incidentDetail, /log\.date \? `\$\{log\.date\} · \$\{log\.time\}` : log\.time/);
assert.doesNotMatch(incidentDetail, /\{report\.date\} · \{log\.time\}/);

assert.match(source('mobile/app/help/guest-history.tsx'), /formatManilaMobileDateTime\(entry\.createdAt\)/);
assert.match(source('mobile/lib/report-status-feedback.ts'), /formatManilaMobileTime\(state\.lastCheckedAt\)/);

for (const file of [
  'mobile/components/responder/SelectIncidentModal.tsx',
  'mobile/components/responder/ResponderHome.tsx',
]) {
  const responderSource = source(file);
  assert.match(responderSource, /formatManilaMobileTime/);
  assert.doesNotMatch(responderSource, /toLocaleTimeString/);
}
assert.match(source('mobile/app/(tabs)/reports/index.tsx'), /manilaCalendarDateBounds\(days, now\)/);

console.log('Public timeline and mobile time checks passed.');
