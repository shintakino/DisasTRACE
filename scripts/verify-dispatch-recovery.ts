import assert from 'node:assert/strict';
import {
  canCascadeDispatchOffer,
  canResponderAcceptDispatchOffer,
  evaluateManualDispatchEligibility,
  isResponderHeartbeatFresh,
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

check('manual dispatch requires a fresh approved standby responder', () => {
  const now = new Date('2026-09-07T10:00:00.000Z');
  const eligibleResponder = {
    role: 'ambulance_responder',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    dutyStatus: 'ON_DUTY',
    lastLocationUpdatedAt: new Date('2026-09-07T09:58:00.000Z'),
  };

  assert.equal(isResponderHeartbeatFresh(eligibleResponder.lastLocationUpdatedAt, now), true);
  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'PENDING',
    incident: null,
    responder: eligibleResponder,
    now,
  }), { allowed: true });

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'PENDING',
    incident: null,
    responder: {
      ...eligibleResponder,
      lastLocationUpdatedAt: new Date('2026-09-07T09:54:59.000Z'),
    },
    now,
  }), {
    allowed: false,
    code: 'RESPONDER_OFFLINE',
    message: 'Selected responder is offline or has a stale location. Choose a standby responder.',
  });

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'PENDING',
    incident: null,
    responder: {
      ...eligibleResponder,
      verificationStatus: 'PENDING',
    },
    now,
  }), {
    allowed: false,
    code: 'RESPONDER_UNAVAILABLE',
    message: 'Selected responder is no longer available.',
  });
});

check('manual dispatch rejects stale report state and active offers', () => {
  const now = new Date('2026-09-07T10:00:00.000Z');
  const responder = {
    role: 'ambulance_responder',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    dutyStatus: 'ON_DUTY',
    lastLocationUpdatedAt: new Date('2026-09-07T09:59:00.000Z'),
  };

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'REJECTED',
    incident: null,
    responder,
    now,
  }), {
    allowed: false,
    code: 'REPORT_CLOSED',
    message: 'This report was already rejected or marked as a duplicate. Refresh the verification queue.',
  });

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'VERIFIED',
    incident: {
      status: 'DISPATCHED',
      currentOfferResponderId: 'responder-2',
      responderId: null,
    },
    responder,
    now,
  }), {
    allowed: false,
    code: 'ACTIVE_DISPATCH_EXISTS',
    message: 'This report already has an active dispatch offer. Refresh the verification queue.',
  });

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'VERIFIED',
    incident: {
      status: 'DISPATCHED',
      currentOfferResponderId: null,
      responderId: null,
    },
    responder,
    now,
  }), { allowed: true });
});

console.log('All dispatch recovery checks passed.');
