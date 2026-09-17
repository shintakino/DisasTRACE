import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildIncidentDemandOutlook, zeroFillCompletedBuckets } from '../lib/incident-demand-outlook';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const outlook = buildIncidentDemandOutlook({
  completedBuckets: [2, 4, 6, 8, 10, 12, 14, 16],
  verifiedIncidents: 72,
  leadingType: 'Medical Emergency',
  leadingBarangay: 'Poblacion',
});
assert.equal(outlook.available, true);
assert.equal(outlook.projectedCount, 14);
assert.deepEqual(outlook.observedRange, { min: 10, max: 16 });
assert.equal(outlook.direction, 'rising');
assert.match(outlook.disclaimer, /planning estimate/i);

const insufficient = buildIncidentDemandOutlook({
  completedBuckets: [1, 2, 1],
  verifiedIncidents: 4,
  leadingType: null,
  leadingBarangay: null,
});
assert.equal(insufficient.available, false);
assert.equal(insufficient.reason, 'INSUFFICIENT_HISTORY');
const filled = zeroFillCompletedBuckets('month', [{ label: 'Aug 2026', count: 3 }], new Date('2026-09-16T00:00:00Z'));
assert.equal(filled.length, 8);
assert.equal(filled.at(-1)?.count, 3);
assert.equal(filled.filter((bucket) => bucket.count === 0).length, 7);

const verificationRoute = source('app/api/verification/route.ts');
const verificationGet = verificationRoute.slice(0, verificationRoute.indexOf('export async function POST'));
assert.doesNotMatch(verificationGet, /checkAndCascadeExpiredOffers|healOrphanedActiveDispatches|retryPendingAutomaticDispatches/);
assert.match(verificationRoute, /offerExpiresAt/);

const schedulerRoute = source('app/api/dispatch-engine/route.ts');
assert.match(schedulerRoute, /drainPendingAutomaticDispatches/);
assert.match(schedulerRoute, /processed/);
assert.match(schedulerRoute, /failed/);

const auditRoute = source('app/api/audit/route.ts');
assert.match(auditRoute, /cdrrmo_super_admin/);
assert.match(auditRoute, /entityId/);
assert.match(auditRoute, /details/);

const classificationRoute = source('app/api/verification/[id]/classification/route.ts');
assert.match(classificationRoute, /Case Closed reports cannot be reclassified|resolved incident cannot be reclassified/i);
const coordinationRoute = source('app/api/verification/[id]/coordination/route.ts');
assert.match(coordinationRoute, /Case Closed reports cannot be changed|resolved incident cannot be changed/i);

const step4 = source('mobile/components/auth/Step4.tsx');
assert.match(step4, /Read Data Privacy Policy/);
assert.match(step4, /privacyPolicy/);
assert.match(step4, /disabled=[\s\S]*isLoading[\s\S]*isValid/);

const signup = source('mobile/app/(auth)/sign-up.tsx');
assert.match(signup, /privacy_consent_at/);
assert.match(signup, /privacy_policy_version/);

const chatbot = source('mobile/app/help/chatbot.tsx');
assert.ok(
  chatbot.indexOf('markSubmitted(report)') < chatbot.indexOf('await archiveGuestReport'),
  'The server-confirmed state must be committed before best-effort local guest history.',
);

console.log('Panel QA hardening verification passed.');
