import assert from 'node:assert/strict';
import {
  canCascadeDispatchOffer,
  canClaimAutomaticDispatchTurn,
  canResponderAcceptDispatchOffer,
  DISPATCH_ACCEPTANCE_GRACE_MS,
  evaluateManualDispatchEligibility,
  isResponderHeartbeatFresh,
  prioritizeAutomaticDispatchRequests,
  requiresPaccReassignment,
  selectNextDispatchableRequest,
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

check('only the first waiting emergency may claim an automatic responder', () => {
  const firstRequestId = 'request-first';
  const laterRequestId = 'request-later';
  assert.equal(canClaimAutomaticDispatchTurn(firstRequestId, firstRequestId), true);
  assert.equal(canClaimAutomaticDispatchTurn(firstRequestId, laterRequestId), false);
  assert.equal(canClaimAutomaticDispatchTurn(null, firstRequestId), false);
});

check('orders dispatchable emergencies by severity tier and FIFO within a tier', () => {
  const requests = prioritizeAutomaticDispatchRequests([
    { id: 'high-new', severity: 'High', createdAt: new Date('2026-09-15T10:03:00Z') },
    { id: 'critical-new', severity: 'Critical', createdAt: new Date('2026-09-15T10:02:00Z') },
    { id: 'critical-old', severity: 'Critical', createdAt: new Date('2026-09-15T10:01:00Z') },
    { id: 'medium-old', severity: 'Medium', createdAt: new Date('2026-09-15T10:00:00Z') },
  ]);

  assert.deepEqual(requests.map((request) => request.id), [
    'critical-old',
    'critical-new',
    'high-new',
    'medium-old',
  ]);
});

check('an undispatchable older report does not block the next eligible report', () => {
  const next = selectNextDispatchableRequest([
    { id: 'critical-without-unit', severity: 'Critical', createdAt: new Date('2026-09-15T10:00:00Z') },
    { id: 'critical-with-unit', severity: 'Critical', createdAt: new Date('2026-09-15T10:01:00Z') },
    { id: 'high-with-unit', severity: 'High', createdAt: new Date('2026-09-15T09:59:00Z') },
  ], new Set(['critical-with-unit', 'high-with-unit']));

  assert.equal(next?.id, 'critical-with-unit');
});

check('accepts only the responder who owns an unassigned dispatch offer', () => {
  const responderId = 'responder-1';
  const now = new Date('2026-09-11T10:00:00.000Z');
  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: null,
    offerExpiresAt: new Date('2026-09-11T10:00:05.000Z'),
  }, responderId, now), true);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: null,
    offerExpiresAt: new Date('2026-09-11T09:59:55.999Z'),
  }, responderId, now), false);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: null,
    offerExpiresAt: new Date('2026-09-11T09:59:56.001Z'),
  }, responderId, now), true);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: null,
    offerExpiresAt: new Date('2026-09-11T09:59:56.000Z'),
  }, responderId, now), false);

  assert.equal(DISPATCH_ACCEPTANCE_GRACE_MS, 4_000);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: 'responder-2',
    responderId: null,
    offerExpiresAt: new Date('2026-09-11T10:00:05.000Z'),
  }, responderId, now), false);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'EN_ROUTE',
    currentOfferResponderId: responderId,
    responderId: null,
    offerExpiresAt: new Date('2026-09-11T10:00:05.000Z'),
  }, responderId, now), false);

  assert.equal(canResponderAcceptDispatchOffer({
    status: 'DISPATCHED',
    currentOfferResponderId: responderId,
    responderId: 'responder-2',
    offerExpiresAt: new Date('2026-09-11T10:00:05.000Z'),
  }, responderId, now), false);
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

check('an exhausted offer remains a PACC reassignment item', () => {
  assert.equal(requiresPaccReassignment({
    status: 'DISPATCHED',
    currentOfferResponderId: null,
    responderId: null,
  }), true);

  assert.equal(requiresPaccReassignment({
    status: 'DISPATCHED',
    currentOfferResponderId: 'responder-1',
    responderId: null,
  }), false);

  assert.equal(requiresPaccReassignment({
    status: 'EN_ROUTE',
    currentOfferResponderId: null,
    responderId: 'responder-1',
  }), false);
});

check('manual dispatch requires a fresh approved standby responder', () => {
  const now = new Date('2026-09-07T10:00:00.000Z');
  const eligibleResponder = {
    role: 'ambulance_responder',
    status: 'ACTIVE',
    verificationStatus: 'APPROVED',
    dutyStatus: 'ON_DUTY',
    lastLocationUpdatedAt: new Date('2026-09-07T09:59:30.000Z'),
  };

  assert.equal(isResponderHeartbeatFresh(eligibleResponder.lastLocationUpdatedAt, now), true);
  assert.equal(isResponderHeartbeatFresh(new Date('2026-09-07T09:58:31.000Z'), now), true);
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
      lastLocationUpdatedAt: new Date('2026-09-07T09:58:29.000Z'),
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
    code: 'REPORT_REJECTED',
    message: 'This report was rejected and cannot be dispatched. Review its rejection record.',
  });

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'DUPLICATE', incident: null, responder, now,
  }), {
    allowed: false,
    code: 'REPORT_DUPLICATE',
    message: 'This report was merged as a duplicate and cannot be dispatched separately.',
  });

  assert.deepEqual(evaluateManualDispatchEligibility({
    requestStatus: 'VERIFIED',
    incident: { status: 'RESOLVED', currentOfferResponderId: null, responderId: 'responder-1' },
    responder,
    now,
  }), {
    allowed: false,
    code: 'REPORT_CLOSED',
    message: 'This response is Case Closed and cannot be dispatched again.',
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

  // An automatic offer that expired without an alternate is intentionally
  // overrideable by PACC once it has no responder owner.
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
