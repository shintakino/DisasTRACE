import assert from 'node:assert/strict';
import {
  classifyActiveVerificationBucket,
  classifyVerificationQueueItem,
  normalizeRequiredRejectionReason,
  projectReporterReportStatus,
} from '../lib/rejected-report-workflow';
import { deriveRejectedReportTransition } from '../mobile/lib/rejected-report-workflow';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('keeps rejected reports out of every active verification bucket', () => {
  assert.equal(classifyVerificationQueueItem({
    requestStatus: 'PENDING',
    incidentStatus: null,
  }), 'ACTIVE');
  assert.equal(classifyVerificationQueueItem({
    requestStatus: 'VERIFIED',
    incidentStatus: 'EN_ROUTE',
  }), 'ACTIVE');

  const rejectedBucket = classifyVerificationQueueItem({
    requestStatus: 'REJECTED',
    incidentStatus: null,
  });
  assert.equal(rejectedBucket, 'REJECTED');
  assert.notEqual(rejectedBucket, 'ACTIVE');
  assert.equal(classifyActiveVerificationBucket({
    requestStatus: 'REJECTED',
    incidentStatus: null,
    triageClassification: 'HIGH_CONFIDENCE_EMERGENCY',
  }), null);
});

check('distinguishes dispatcher rejection from a completed case', () => {
  assert.equal(classifyVerificationQueueItem({
    requestStatus: 'REJECTED',
    incidentStatus: 'RESOLVED',
  }), 'REJECTED');
  assert.equal(classifyVerificationQueueItem({
    requestStatus: 'VERIFIED',
    incidentStatus: 'RESOLVED',
  }), 'CASE_CLOSED');
});

check('requires and normalizes a meaningful PACC rejection reason', () => {
  assert.equal(normalizeRequiredRejectionReason(undefined), null);
  assert.equal(normalizeRequiredRejectionReason('   \n\t  '), null);
  assert.equal(
    normalizeRequiredRejectionReason('  The evidence photo   does not show the reported incident.  '),
    'The evidence photo does not show the reported incident.',
  );
});

check('projects rejection as a terminal reporter status with the exact reason', () => {
  const status = projectReporterReportStatus({
    requestStatus: 'REJECTED',
    rejectionReason: '  The location could not   be verified. ',
  });

  assert.equal(status.status, 'REJECTED');
  assert.equal(status.outcome, 'REJECTED');
  assert.equal(status.terminal, true);
  assert.equal(status.rejectionReason, 'The location could not be verified.');
  assert.match(status.responseStatus, /rejected/i);
  assert.match(status.responseStatus, /The location could not be verified\./);
  assert.match(status.responseStatus, /submit a new report/i);
  assert.doesNotMatch(status.responseStatus, /case closed/i);
});

check('distinguishes reporter cancellation from a PACC rejection', () => {
  const status = projectReporterReportStatus({
    requestStatus: 'REJECTED',
    rejectionReason: 'Cancelled by the reporter through the DisasTRACE chatbot.',
  });
  assert.equal(status.outcome, 'CANCELLED');
  assert.match(status.responseStatus, /You cancelled this report/i);
  assert.doesNotMatch(status.responseStatus, /PACC rejected/i);
});

check('gives a rejected guest a terminal reset and a guest resubmission route', () => {
  const transition = deriveRejectedReportTransition({
    reporterMode: 'guest',
    rejectionReason: 'Outside the documented service area.',
  });

  assert.equal(transition.nextLifecycle, 'IDLE');
  assert.equal(transition.shouldClearPersistedReport, true);
  assert.equal(transition.canSubmitAgain, true);
  assert.equal(transition.startNewReportRoute, '/help/chatbot?mode=guest');
  assert.equal(transition.homeRoute, '/');
  assert.deepEqual(transition.actions, ['START_NEW_REPORT', 'HOME', 'CALL_PACC']);
  assert.match(transition.message, /Outside the documented service area\./);
});

check('gives a rejected registered reporter a terminal reset and resident resubmission route', () => {
  const transition = deriveRejectedReportTransition({
    reporterMode: 'registered',
    rejectionReason: 'A clearer incident photo is required.',
  });

  assert.equal(transition.nextLifecycle, 'IDLE');
  assert.equal(transition.shouldClearPersistedReport, true);
  assert.equal(transition.canSubmitAgain, true);
  assert.equal(transition.startNewReportRoute, '/help/chatbot?mode=resident');
  assert.equal(transition.homeRoute, '/(tabs)');
  assert.deepEqual(transition.actions, ['START_NEW_REPORT', 'HOME', 'CALL_PACC']);
  assert.match(transition.message, /A clearer incident photo is required\./);
});

console.log('All rejected report workflow checks passed.');
