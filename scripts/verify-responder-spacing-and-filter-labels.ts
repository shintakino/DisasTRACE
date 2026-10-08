import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');

const labels = source('lib/operational-display-labels.ts');
assert.match(labels, /export const ACCOUNT_STATUS_FILTER_LABELS/);
assert.match(labels, /all:\s*"All"/);

const usersHeader = source('components/users/users-header.tsx');
assert.match(usersHeader, /items=\{ACCOUNT_STATUS_FILTER_LABELS\}/);

const rosterFilter = source('components/roster/roster-filter.tsx');
assert.match(rosterFilter, /items=\{ACCOUNT_STATUS_FILTER_LABELS\}/);
assert.match(rosterFilter, /status === "all" \? undefined : status as RosterStatus/);

const responderHome = source('mobile/components/responder/ResponderHome.tsx');
assert.match(responderHome, /flex-row items-center gap-3 flex-1 pr-2/);
assert.match(responderHome, /flex-row items-baseline gap-1/);
assert.doesNotMatch(responderHome, /⚠️ \{drafts\.length\} Unsent/);

const reportForm = source('mobile/components/responder/IncidentReportForm.tsx');
assert.match(reportForm, /flex-row gap-3 mt-2/);
assert.match(reportForm, /text-xs uppercase tracking-widest mb-1\.5">BP/);
assert.match(reportForm, /text-xs uppercase tracking-widest mb-1\.5">HR/);
assert.match(reportForm, /text-xs uppercase tracking-widest mb-1\.5">SPO2/);
assert.match(reportForm, /flex-row gap-4/);

console.log('Responder spacing and title-case filter label checks passed.');
