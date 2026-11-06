import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { verificationIncidentOrder } from '../lib/verification-incident-order';
import { canPaccRejectVerificationRequest, classifyVerificationWorkspaceFilter } from '../lib/rejected-report-workflow';

const read = (path: string) => readFileSync(path, 'utf8');
const recovery = read('mobile/hooks/use-responder-recovery.ts');
assert.match(recovery, /table: 'users', filter: `id=eq\.\$\{ownerId\}`/);
assert.match(recovery, /nextDutyStatus !== lastDutyStatus/, 'GPS updates must not continuously invalidate offer recovery.');
assert.match(recovery, /table: 'notifications', filter: `user_id=eq\.\$\{ownerId\}`/);
assert.match(recovery, /payload\.new\.type === 'dispatch_alert'/);

const rejection = read('lib/reject-verification-request.ts');
assert.doesNotMatch(rejection, /tx\.delete\(incidents\)/, 'Rejection must retain incident foreign-key references.');
assert.doesNotMatch(rejection, /tx\.update\(incidents\)/, 'Rejection must not emit a false field-completion notification.');
assert.match(rejection, /status: 'REJECTED'/);
assert.match(rejection, /eq\(reports\.status, 'SUBMITTED'\)/, 'Submitted field reports must remain protected.');

for (const path of ['lib/reject-verification-request.ts', 'app/api/verification/[id]/dispatch/route.ts', 'app/api/verification/route.ts']) {
  assert.match(read(path), /orderBy\(\.\.\.verificationIncidentOrder\(\)\)/, `${path} must use the same legacy incident ordering.`);
}
assert.match(read('app/api/verification/route.ts'), /if \(!incidentByRequestId\.has\(incident\.requestId\)\)/, 'The highest-priority incident must not be overwritten by an older duplicate.');
assert.match(read('app/api/verification/[id]/dispatch/route.ts'), /await reconcileExpiredOfferForRequest\(id\)/, 'Manual redispatch must reconcile expired offers before its locked eligibility check.');
const query = new PgDialect().sqlToQuery(sql.join(verificationIncidentOrder(), sql`, `)).sql;
assert.match(query, /'RESOLVED' then 0.*'DOCUMENTATION_PENDING' then 1.*created_at" desc.*"id" desc/);

assert.equal(canPaccRejectVerificationRequest({ requestStatus: 'VERIFIED', incident: { incidentStatus: 'DISPATCHED', responderId: null, currentOfferResponderId: null } }), true);
assert.equal(classifyVerificationWorkspaceFilter({ requestStatus: 'REJECTED', incidentStatus: 'RESOLVED', requiresPaccReassignment: true }), 'REJECTED');
assert.equal(classifyVerificationWorkspaceFilter({ requestStatus: 'PENDING', incidentStatus: 'RESOLVED', requiresPaccReassignment: true }), 'CLOSED');
console.log('PASS dispatch delivery triggers, heartbeat deduplication, rejection history retention, and consistent legacy incident selection');
