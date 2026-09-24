import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check("approval API returns the submitted address and barangay", () => {
  const route = source("app/api/users/approval/route.ts");
  const contract = source("types/approval.ts");

  assert.match(route, /address: u\.address \|\| ""/);
  assert.match(route, /barangay: u\.barangay \|\| ""/);
  assert.match(contract, /barangay: z\.string\(\)/);
});

check("approval review presents submitted location before identity evidence", () => {
  const details = source("components/users/approval/applicant-details.tsx");
  const locationIndex = details.indexOf("Submitted residential location");
  const evidenceIndex = details.indexOf("Identity Verification");

  assert.ok(locationIndex >= 0, "location summary must be rendered");
  assert.ok(evidenceIndex >= 0, "identity verification must be rendered");
  assert.ok(locationIndex < evidenceIndex, "location summary must precede identity evidence");
  assert.match(details, /Barangay:<\/span> \{applicant\.barangay\}/);
});

check("dashboard searches debounce input and preserve loaded results while refreshing", () => {
  for (const header of [
    "components/audit/audit-header.tsx",
    "components/logs/logs-header.tsx",
    "components/reports/reports-header.tsx",
  ]) {
    const content = source(header);
    assert.match(content, /useDebouncedValue\(search, 350\)/);
    assert.match(content, /lastPublishedSearch/);
  }

  for (const page of [
    "app/(dashboard)/audit/page.tsx",
    "app/(dashboard)/logs/page.tsx",
    "app/(dashboard)/reports/page.tsx",
  ]) {
    const content = source(page);
    assert.match(content, /const \[isInitialLoading,/);
    assert.match(content, /const \[isRefreshing,/);
    assert.match(content, /Updating results…/);
    assert.doesNotMatch(content, /if \(loading\)|if \(isLoading\)/);
  }
});

console.log("All approval and filter continuity checks passed.");
