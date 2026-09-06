import assert from 'node:assert/strict';
import {
  canCascadeDispatchOffer,
  canResponderAcceptDispatchOffer,
  shouldRetryAutomaticDispatch,
} from '../lib/dispatch-policy';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('retries only pending high-confidence emergencies', () => {
  assert.equal(shouldRetryAutomaticDispatch({
    status: 'PENDING',
    nature: 'EMERGENCY',
    triageClassification: 'HIGH_CONFIDENCE_EMERGENCY',
  }), true);

  assert.equal(shouldRetryAutomaticDispatch({
    status: 'PENDING',
    nature: 'EMERGENCY',
    triageClassification: 'UNCERTAIN_INCOMPLETE',
  }), false);

  assert.equal(shouldRetryAutomaticDispatch({
    status: 'VERIFIED',
    nature: 'EMERGENCY',
    triageClassification: 'HIGH_CONFIDENCE_EMERGENCY',
  }), false);

  assert.equal(shouldRetryAutomaticDispatch({
    status: 'PENDING',
    nature: 'NON-EMERGENCY',
    triageClassification: 'HIGH_CONFIDENCE_EMERGENCY',
  }), false);
});

check('accepts only the responder who owns an unassigned dispatch offer', () => {
  const responderId = 'responder-1';
  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: null,
  }, responderId), true);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: 'responder-2',
    responderId: null,
  }, responderId), false);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'EN_ROUTE',
    currentOfferResponderId: responderId,
    responderId: null,
  }, responderId), false);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: 'responder-2',
  }, responderId), false);
});

check('cascades only the still-current unassigned offer', () => {
  const responderId = 'responder-1';
  assert.equal(canCascadeDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: null,
  }, responderId), true);

  assert.equal(canCascadeDispatchOffer({
    status: 'EN_ROUTE',
    currentOfferResponderId: null,
    responderId,
  }, responderId), false);

  assert.equal(canCascadeDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: 'responder-2',
    responderId: null,
  }, responderId), false);
});

console.log('All dispatch recovery checks passed.');
