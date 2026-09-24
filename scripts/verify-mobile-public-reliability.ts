import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNextMissingSlot } from '../mobile/lib/chatbot-contracts';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
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

check('cold GPS launch retries and uses a trusted last-known fix', () => {
  const hook = source('mobile/hooks/use-live-barangay.ts');
  assert.match(hook, /getLastKnownPositionAsync/);
  assert.match(hook, /LOCATION_RETRY_COUNT/);
  assert.match(hook, /readCurrentPosition/);
  assert.match(hook, /isMockedLocation/);
});

check('resident report history has a device-local offline cache', () => {
  const reports = source('mobile/app/(tabs)/reports/index.tsx');
  const cache = source('mobile/lib/resident-report-cache.ts');
  assert.match(reports, /readResidentReportCache/);
  assert.match(reports, /writeResidentReportCache/);
  assert.match(reports, /Showing your last synced reports/);
  assert.match(cache, /MAX_CACHED_REPORTS/);
  assert.match(cache, /resident-reports-/);
});

check('chatbot evidence requires a clear use-or-retake decision', () => {
  const chatbot = source('mobile/app/help/chatbot.tsx');
  assert.match(chatbot, /pendingEvidence/);
  assert.match(chatbot, /Retake photo/);
  assert.match(chatbot, /Use this photo/);
  assert.match(chatbot, /Photo captured/);
  assert.match(chatbot, /discardDraft\(\);[\s\S]*setPendingEvidence\(null\)/);
  assert.match(chatbot, /current\.clearReportToIdle\(\);[\s\S]*setPendingEvidence\(null\)/);
});

check('chatbot exposes correction and disables empty required actions', () => {
  const chatbot = source('mobile/app/help/chatbot.tsx');
  assert.match(chatbot, /Review and correct previous answers/);
  assert.match(chatbot, /disabled=\{waiting \|\| !fieldValue\.trim\(\)\}/);
  assert.match(chatbot, /getNextMissingSlot\(draft, reporterMode\) !== 'review'/);
  assert.equal(getNextMissingSlot({}, 'registered'), 'evidence');
});

console.log('All mobile public reliability checks passed.');
