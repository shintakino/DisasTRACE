import assert from 'node:assert/strict';
import {
  createActionErrorFeedback,
  createActionProcessingFeedback,
  createActionSuccessFeedback,
} from '../lib/operator-action-feedback';

const processing = createActionProcessingFeedback('Rejecting REQ-24', 'The report is still being processed.');
assert.equal(processing.phase, 'processing');
assert.match(processing.nextStep, /Wait/i);

const rejected = createActionSuccessFeedback({
  title: 'REQ-24 rejected',
  detail: 'Removed from the active queue. Reason: Location could not be verified.',
  nextStep: 'The reporter can see the rejection reason.',
  userAction: 'Review the next priority report.',
});
assert.equal(rejected.phase, 'success');
assert.match(rejected.detail, /Removed from the active queue/);
assert.match(rejected.nextStep, /reporter/i);

const failed = createActionErrorFeedback('Classification was not changed', 'Closed reports cannot be reclassified.');
assert.equal(failed.phase, 'error');
assert.equal(failed.detail, 'Closed reports cannot be reclassified.');
assert.match(failed.userAction, /try again|refresh/i);

console.log('Major action feedback checks passed.');
