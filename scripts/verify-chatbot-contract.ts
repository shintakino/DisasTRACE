import assert from 'node:assert/strict';
import {
  CHATBOT_INCIDENT_TYPES,
  ChatbotResponseSchema,
  ChatbotSubmissionIdSchema,
  deriveIntakePhase,
  parseExactPeopleCount,
} from '../lib/chatbot/contracts';
import { KNOWLEDGE_CATALOG } from '../lib/chatbot/knowledge';
import { deterministicChatbotResponse } from '../lib/chatbot/policy';
import { prepareProviderMessage } from '../lib/chatbot/privacy';
import { canCancelChatbotReport, isUnresolvedReportStatus } from '../lib/chatbot/lifecycle';
import { checkChatbotRateLimit } from '../lib/chatbot/rate-limit';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('accepts one exact numeric people count', () => assert.equal(parseExactPeopleCount('3'), 3));
check('normalizes the approved Filipino number word', () => assert.equal(parseExactPeopleCount('tatlo'), 3));
check('normalizes an explicit people-count correction', () => {
  assert.equal(parseExactPeopleCount('actually four'), 4);
  assert.equal(parseExactPeopleCount('apat pala'), 4);
});
check('echoes the normalized exact count before advancing', () => {
  const response = deterministicChatbotResponse({ message: '4 people', mode: 'DRAFT', reporterMode: 'guest', draft: { pendingSlot: 'peopleInvolved' } });
  assert.equal(response.slotUpdates.peopleInvolved, 4);
  assert.match(response.reply, /exactly 4 people/);
});
check('rejects ranges, decimals, zero, and values above 999', () => {
  for (const input of ['2-5', 'more than 10', '1.5', '0', '1000']) assert.equal(parseExactPeopleCount(input), null);
});
check('keeps the six existing incident types', () => assert.deepEqual(CHATBOT_INCIDENT_TYPES, ['Medical Emergency', 'Vehicular Collision', 'Fire Emergency', 'Structural Failure', 'Flood/Water', 'Unknown Cause']));
check('accepts UUID submission IDs and rejects arbitrary primary keys', () => {
  assert.equal(ChatbotSubmissionIdSchema.safeParse('f2df78f4-c5a4-48a7-92c5-2ef7288ce104').success, true);
  assert.equal(ChatbotSubmissionIdSchema.safeParse('attacker-selected-id').success, false);
});
check('keeps catalog identifiers unique', () => assert.equal(new Set(KNOWLEDGE_CATALOG.map(({ id }) => id)).size, KNOWLEDGE_CATALOG.length));
check('distinguishes safety guidance by disaster phase', () => {
  assert.equal(deterministicChatbotResponse({ message: 'What should I do during a typhoon?', mode: 'IDLE', reporterMode: 'guest', draft: {} }).replyKey, 'typhoon-during');
  assert.equal(deterministicChatbotResponse({ message: 'What should I do after an earthquake?', mode: 'IDLE', reporterMode: 'guest', draft: {} }).replyKey, 'earthquake-after');
  assert.equal(deterministicChatbotResponse({ message: 'What should I bring during evacuation?', mode: 'IDLE', reporterMode: 'guest', draft: {} }).replyKey, 'evacuation-items');
});
check('answers an approved FAQ during count collection and resumes the count slot', () => {
  const response = deterministicChatbotResponse({ message: 'What is a go bag?', mode: 'DRAFT', reporterMode: 'guest', draft: { pendingSlot: 'peopleInvolved' } });
  assert.equal(response.replyKey, 'go-bag');
  assert.equal(response.nextSlot, 'peopleInvolved');
  assert.equal(response.resumePending, true);
});
check('returns a dedicated limitation for unverified real-time questions', () => {
  assert.equal(deterministicChatbotResponse({ message: 'Is there flooding right now?', mode: 'IDLE', reporterMode: 'guest', draft: {} }).replyKey, 'real-time-unavailable');
});
check('starts a fire report from free text using existing values', () => {
  const response = deterministicChatbotResponse({ message: 'There is a fire', mode: 'IDLE', reporterMode: 'guest', draft: {} });
  assert.equal(response.action, 'START_REPORT');
  assert.deepEqual(response.slotUpdates, { incidentType: 'Fire Emergency', nature: 'EMERGENCY' });
});
check('matches the response style for Filipino report messages', () => {
  const response = deterministicChatbotResponse({ message: 'May sunog', mode: 'IDLE', reporterMode: 'guest', draft: {} });
  assert.equal(response.languageStyle, 'fil');
  assert.match(response.reply, /Nakuha|Kumpirmahin/i);
});
check('extracts multiple safe fields from one report message', () => {
  const response = deterministicChatbotResponse({ message: 'May sunog, 3 people and one is unconscious', mode: 'DRAFT', reporterMode: 'guest', draft: { pendingSlot: 'incidentType' } });
  assert.deepEqual(response.slotUpdates, { incidentType: 'Fire Emergency', nature: 'EMERGENCY', peopleInvolved: 3, victimCondition: 'Unconscious / critical' });
});
check('maps patient transport to an existing non-emergency medical type', () => {
  const response = deterministicChatbotResponse({ message: 'Patient transport please', mode: 'DRAFT', reporterMode: 'guest', draft: { pendingSlot: 'incidentType' } });
  assert.equal(response.slotUpdates.incidentType, 'Medical Emergency');
  assert.equal(response.slotUpdates.nature, 'NON-EMERGENCY');
});
check('validates every deterministic response against the public schema', () => {
  const response = deterministicChatbotResponse({ message: 'random trivia', mode: 'IDLE', reporterMode: 'guest', draft: {} });
  assert.equal(ChatbotResponseSchema.safeParse(response).success, true);
});
check('does not send likely personal or location data to the provider', () => {
  for (const message of ['My phone is 09171234567', 'Email me at resident@example.com', 'I am at 14.9540, 120.9010', 'My name is Juan Dela Cruz at Barangay Tiaong', 'Check REQ-2026-1234', 'See https://example.test/photo.jpg', 'f2df78f4-c5a4-48a7-92c5-2ef7288ce104']) assert.equal(prepareProviderMessage(message), null);
  assert.equal(prepareProviderMessage('How does DisasTRACE work?'), 'How does DisasTRACE work?');
});
check('derives five adaptive progress phases from completed slots', () => {
  assert.equal(deriveIntakePhase({}), 1);
  assert.equal(deriveIntakePhase({ evidence: true, incidentType: 'Fire Emergency', nature: 'EMERGENCY' }), 2);
  assert.equal(deriveIntakePhase({ evidence: true, incidentType: 'Fire Emergency', nature: 'EMERGENCY', location: true, contactNumber: true }), 3);
  assert.equal(deriveIntakePhase({ evidence: true, incidentType: 'Fire Emergency', nature: 'EMERGENCY', location: true, contactNumber: true, peopleInvolved: 3, victimCondition: 'Unconscious / critical' }), 4);
});
check('allows cancellation only for pending reports without an incident', () => {
  assert.equal(canCancelChatbotReport({ status: 'PENDING', hasIncident: false }), true);
  assert.equal(canCancelChatbotReport({ status: 'PENDING', hasIncident: true }), false);
  for (const status of ['VERIFIED', 'REJECTED', 'DUPLICATE'] as const) assert.equal(canCancelChatbotReport({ status, hasIncident: false }), false);
});
check('restores only unresolved pending or verified report states', () => {
  assert.equal(isUnresolvedReportStatus('PENDING'), true);
  assert.equal(isUnresolvedReportStatus('VERIFIED'), true);
  assert.equal(isUnresolvedReportStatus('REJECTED'), false);
  assert.equal(isUnresolvedReportStatus('DUPLICATE'), true);
});
check('a rotating client nonce cannot bypass the guest network quota', () => {
  const networkKey = `contract-test-${Date.now()}-${Math.random()}`;
  for (let count = 0; count < 20; count += 1) {
    assert.equal(checkChatbotRateLimit({ reporterMode: 'guest', networkKey, conversationNonce: `nonce-${count}` }).limited, false);
  }
  assert.equal(checkChatbotRateLimit({ reporterMode: 'guest', networkKey, conversationNonce: 'fresh-nonce' }).limited, true);
});

console.log('All chatbot contract checks passed.');
