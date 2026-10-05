import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shouldKeepReportsVisibleWhileFetching } from '../mobile/lib/report-list-loading-policy';
import {
  draftReminderKeyForResponder,
  shouldScheduleDraftReminder,
} from '../mobile/lib/draft-reminder-policy';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

check('keeps previously loaded reports visible while a filter request is running', () => {
  assert.equal(shouldKeepReportsVisibleWhileFetching({ hasLoadedOnce: true, isFetching: true }), true);
  assert.equal(shouldKeepReportsVisibleWhileFetching({ hasLoadedOnce: false, isFetching: true }), false);
});

check('schedules one responder-owned reminder only while online unsent drafts exist', () => {
  assert.equal(shouldScheduleDraftReminder({ responderId: 'responder-a', isOnline: true, draftCount: 1 }), true);
  assert.equal(shouldScheduleDraftReminder({ responderId: 'responder-a', isOnline: false, draftCount: 1 }), false);
  assert.equal(shouldScheduleDraftReminder({ responderId: 'responder-a', isOnline: true, draftCount: 0 }), false);
  assert.equal(draftReminderKeyForResponder('responder-a'), 'disas_trace_draft_reminder_notification_id:responder-a');
  assert.notEqual(draftReminderKeyForResponder('responder-a'), draftReminderKeyForResponder('responder-b'));
});

check('keeps draft scheduling out of each offline-sync hook instance', () => {
  const offlineReports = source('mobile/hooks/use-offline-reports.ts');
  const reminder = source('mobile/hooks/use-draft-reminder.ts');
  assert.doesNotMatch(offlineReports, /scheduleNotificationAsync/);
  assert.match(reminder, /draftReminderKeyForResponder/);
  assert.match(reminder, /cancelDraftReminder/);
});

check('cancels a pending autosave before an online submission can re-create its draft', () => {
  const form = source('mobile/components/responder/IncidentReportForm.tsx');
  assert.match(form, /autoSaveTimerRef/);
  assert.match(form, /!isSubmittingReport/);
  assert.match(form, /await submitReport\(formIncident\.id, formData\)/);
});

check('requires server acknowledgement before local logout and supports explicit device transfer', () => {
  const mobileAuth = source('mobile/lib/mobile-auth.ts');
  const signInRoute = source('app/api/mobile-auth/sign-in/route.ts');
  assert.ok(mobileAuth.indexOf('/api/mobile-auth/sign-out') < mobileAuth.indexOf("supabase.auth.signOut({ scope: 'local' })"));
  assert.match(mobileAuth, /payload\.released !== true/);
  assert.match(signInRoute, /replaceExistingDevice/);
  assert.match(signInRoute, /MOBILE_SESSION_TRANSFERRED/);
});

check('handles a failed secure logout at every mobile logout entry point', () => {
  const logoutScreens = [
    'mobile/app/(verification)/pending.tsx',
    'mobile/app/(verification)/rejected.tsx',
    'mobile/app/(verification)/banned.tsx',
    'mobile/app/help/pending.tsx',
    'mobile/app/help/tracking.tsx',
    'mobile/components/responder/ResponderHome.tsx',
  ];
  for (const path of logoutScreens) {
    const screen = source(path);
    assert.match(screen, /signOutFromMobile\(\)[\s\S]{0,500}catch/,
      `${path} must catch a failed server-confirmed logout`);
    assert.match(screen, /Sign out unavailable/,
      `${path} must explain why the session remains active`);
  }
});

console.log('Mobile resilience policy checks passed.');
