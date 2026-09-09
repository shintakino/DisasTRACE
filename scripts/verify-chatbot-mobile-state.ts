import assert from 'node:assert/strict';
import {
  createInitialChatbotState,
  deriveMobileIntakePhase,
  getNextMissingSlot,
  isReportProgressVisible,
  isWithinBaliwag,
  parseExactPeopleInput,
  restorePersistedChatbotState,
  deriveChatbotNature,
} from '../mobile/lib/chatbot-contracts';
import { shouldResumeResidentRequest } from '../mobile/lib/active-incident';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('mobile exact-count parser accepts digits and Filipino words', () => {
  assert.equal(parseExactPeopleInput('3'), 3);
  assert.equal(parseExactPeopleInput('tatlo'), 3);
  assert.equal(parseExactPeopleInput('actually four'), 4);
});

check('mobile exact-count parser never turns a range into a different count', () => {
  for (const value of ['2-5', '2 to 5', '1.5', '0', '1000']) {
    assert.equal(parseExactPeopleInput(value), null);
  }
});

check('chatbot incident choices derive emergency nature without a user toggle', () => {
  assert.equal(deriveChatbotNature('Fire Emergency'), 'EMERGENCY');
  assert.equal(deriveChatbotNature('Medical Emergency'), 'EMERGENCY');
});

check('resident home resumes only active pending or verified requests', () => {
  assert.equal(shouldResumeResidentRequest({ status: 'PENDING' }), true);
  assert.equal(shouldResumeResidentRequest({ status: 'VERIFIED', incidentStatus: 'EN_ROUTE' }), true);
  assert.equal(shouldResumeResidentRequest({ status: 'VERIFIED', incidentStatus: 'RESOLVED' }), false);
  assert.equal(shouldResumeResidentRequest({ status: 'REJECTED' }), false);
});

check('idle questions never show report progress', () => {
  assert.equal(isReportProgressVisible('IDLE'), false);
  assert.equal(deriveMobileIntakePhase({}, 'guest', 'IDLE'), null);
});

check('guest and registered drafts have adaptive required slots', () => {
  const registeredDraft = {
    photoUri: 'file://evidence.jpg',
    incidentType: 'Fire Emergency' as const,
    nature: 'EMERGENCY' as const,
    latitude: 14.95,
    longitude: 120.9,
  };
  assert.equal(getNextMissingSlot(registeredDraft, 'registered'), 'peopleInvolved');
  assert.equal(getNextMissingSlot(registeredDraft, 'guest'), 'contactNumber');
});

check('out-of-area GPS cannot advance a chatbot report', () => {
  const outsideBaliwagDraft = {
    photoUri: 'file://evidence.jpg',
    incidentType: 'Fire Emergency' as const,
    nature: 'EMERGENCY' as const,
    latitude: 14.5,
    longitude: 121.1,
    landmarks: 'Nearby landmark',
  };
  assert.equal(isWithinBaliwag(outsideBaliwagDraft.latitude, outsideBaliwagDraft.longitude), false);
  assert.equal(getNextMissingSlot(outsideBaliwagDraft, 'registered'), 'location');
});

check('complete report reaches review then submission phase', () => {
  const complete = {
    photoUri: 'file://evidence.jpg',
    incidentType: 'Fire Emergency' as const,
    nature: 'EMERGENCY' as const,
    latitude: 14.95,
    longitude: 120.9,
    landmarks: 'Baliwag City Hall',
    contactNumber: '09171234567',
    peopleInvolved: 3,
    victimCondition: 'Conscious and unstable' as const,
  };
  assert.equal(getNextMissingSlot(complete, 'guest'), 'review');
  assert.equal(deriveMobileIntakePhase(complete, 'guest', 'DRAFT'), 4);
  assert.equal(deriveMobileIntakePhase(complete, 'guest', 'SUBMITTING'), 5);
});

check('restoration preserves one submission identity and unresolved report', () => {
  const initial = createInitialChatbotState('guest');
  const restored = restorePersistedChatbotState({
    ...initial,
    ownerId: 'guest',
    lifecycle: 'SUBMITTED_PENDING',
    submissionId: 'f2df78f4-c5a4-48a7-92c5-2ef7288ce104',
    activeReport: {
      id: 'f2df78f4-c5a4-48a7-92c5-2ef7288ce104',
      displayId: 'REQ-2026-1234',
      reporterMode: 'guest',
      guestAccessToken: 'a'.repeat(64),
      status: 'PENDING',
      responseStatus: 'PACC is reviewing your report.',
      hasIncident: false,
    },
  });
  assert.equal(restored.lifecycle, 'SUBMITTED_PENDING');
  assert.equal(restored.submissionId, restored.activeReport?.id);
});

check('an interrupted submission restores as a retryable draft with the same identity', () => {
  const restored = restorePersistedChatbotState({
    ...createInitialChatbotState('registered'),
    ownerId: 'resident-123',
    lifecycle: 'SUBMITTING',
    submissionId: '28123602-c8ee-42a8-a2a9-c16c43098650',
    draft: {
      photoUri: 'file://evidence.jpg',
      imageUrl: 'https://example.test/evidence.jpg',
      incidentType: 'Medical Emergency',
      nature: 'NON-EMERGENCY',
      latitude: 14.95,
      longitude: 120.9,
      peopleInvolved: 1,
      victimCondition: 'Conscious and stable',
    },
  });
  assert.equal(restored.lifecycle, 'DRAFT');
  assert.equal(restored.submissionId, '28123602-c8ee-42a8-a2a9-c16c43098650');
  assert.equal(restored.draft.imageUrl, 'https://example.test/evidence.jpg');
});

check('invalid persisted state fails closed to idle', () => {
  const restored = restorePersistedChatbotState({ lifecycle: 'SUBMITTED_PENDING' });
  assert.equal(restored.lifecycle, 'IDLE');
  assert.equal(restored.activeReport, null);
});

console.log('All mobile chatbot state checks passed.');
