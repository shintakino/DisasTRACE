import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  OPERATIONAL_ROLE_FILTER_LABELS,
  REPORT_DATE_PRESET_LABELS,
  STATUS_LOG_FILTER_LABELS,
} from "../lib/operational-display-labels";
import { formatManilaDate, formatManilaDateTime, formatManilaTime } from "../lib/manila-presentation";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const testInstant = "2026-09-26T03:03:00.000Z";

assert.equal(formatManilaDate(testInstant), "September 26, 2026");
assert.equal(formatManilaTime(testInstant), "11:03 AM");
assert.equal(formatManilaDateTime(testInstant), "September 26, 2026 at 11:03 AM");

assert.equal(STATUS_LOG_FILTER_LABELS["ON-SCENE"], "On Scene");
assert.equal(STATUS_LOG_FILTER_LABELS["OFF-DUTY"], "Off Duty");
assert.equal(REPORT_DATE_PRESET_LABELS.this_month, "This Month");
assert.equal(REPORT_DATE_PRESET_LABELS.this_year, "This Year");
assert.equal(OPERATIONAL_ROLE_FILTER_LABELS.pacc_admin, "PACC Admin");
assert.equal(OPERATIONAL_ROLE_FILTER_LABELS.cdrrmo_super_admin, "Super Admin");

for (const route of [
  "app/api/logs/route.ts",
  "app/api/audit/route.ts",
  "app/api/reports/route.ts",
  "app/api/reports/[id]/route.ts",
]) {
  const contents = source(route);
  assert.match(contents, /formatManilaDate/);
  assert.match(contents, /formatManilaTime/);
  assert.doesNotMatch(contents, /toLocale(?:Date|Time)String/);
}

assert.match(source("components/logs/logs-header.tsx"), /items=\{STATUS_LOG_FILTER_LABELS\}/);
assert.match(source("components/audit/audit-header.tsx"), /items=\{OPERATIONAL_ROLE_FILTER_LABELS\}/);
assert.match(source("components/users/users-header.tsx"), /items=\{OPERATIONAL_ROLE_FILTER_LABELS\}/);
assert.match(source("components/reports/reports-header.tsx"), /items=\{REPORT_DATE_PRESET_LABELS\}/);

const migration = source("drizzle/0033_yielding_xavin.sql");
assert.match(migration, /USING "created_at" AT TIME ZONE 'UTC'/);
assert.match(migration, /USING "updated_at" AT TIME ZONE 'UTC'/);
assert.match(migration, /CREATE UNIQUE INDEX "reports_incident_id_unique"/);
for (const schema of ["db/schema/audit_logs.ts", "db/schema/reports.ts", "db/schema/status_logs.ts"]) {
  assert.match(source(schema), /withTimezone: true/);
}

for (const header of ["components/logs/logs-header.tsx", "components/audit/audit-header.tsx"]) {
  const contents = source(header);
  assert.doesNotMatch(contents, /new Date\(`\$\{(?:start|end)\}T/);
  assert.match(contents, /from: start \|\| undefined/);
}
for (const page of ["app/(dashboard)/logs/page.tsx", "app/(dashboard)/audit/page.tsx"]) {
  assert.doesNotMatch(source(page), /dateRange\?\.(?:from|to)\.toISOString/);
}
for (const route of ["app/api/logs/route.ts", "app/api/audit/route.ts"]) {
  const contents = source(route);
  assert.match(contents, /manilaDayBounds/);
  assert.match(contents, /lt\(.+\.createdAt, toBounds\.end\)/);
  assert.doesNotMatch(contents, /const fromDate = from \? new Date/);
}

assert.match(source("components/verification/resident-panel.tsx"), /formatManilaDateTime\(request\.receivedAt\)/);
assert.match(source("components/map/map-marker.tsx"), /formatManilaTime\(lastUpdated\)/);
assert.match(source("components/map/incident-panel.tsx"), /formatManilaDateTime\(incident\.lastUpdated\)/);
assert.match(source("app/api/map/incidents/route.ts"), /lastUpdated: inc\.createdAt\.toISOString\(\)/);
assert.match(source("app/api/map/incidents/route.ts"), /lastUpdated: req\.updatedAt\.toISOString\(\)/);

console.log("Operational Manila time and filter-label checks passed.");
