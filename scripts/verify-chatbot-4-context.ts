import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CHATBOT_4_REPORTING_GUIDE, CHATBOT_4_TRIAGE_ALIASES } from '../lib/chatbot/chatbot-4-context';
import { KNOWLEDGE_CATALOG } from '../lib/chatbot/knowledge';
import { deterministicChatbotResponse } from '../lib/chatbot/policy';
import { prepareProviderMessage } from '../lib/chatbot/privacy';
import { validateSuggestedClassification } from '../lib/chatbot/triage-signals';

function check(name: string, assertion: () => void) {
  try {
    assertion();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

check('maps each reviewed Chatbot-4 alias to an existing incident type', () => {
  for (const alias of CHATBOT_4_TRIAGE_ALIASES) {
    assert.ok(validateSuggestedClassification({ incidentType: alias.incidentType, nature: alias.nature }));
  }
});

check('keeps medical first-aid scripts outside the runtime context', () => {
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'lib/chatbot/chatbot-4-context.ts'), 'utf8');
  assert.doesNotMatch(runtimeSource, /begin CPR|place them on their side|loosen any tight clothing/i);
});

check('returns guest reporting guidance without starting a draft', () => {
  const response = deterministicChatbotResponse({ message: 'Paano ako mag-report?', mode: 'IDLE', reporterMode: 'guest', draft: {} });
  assert.equal(response.replyKey, CHATBOT_4_REPORTING_GUIDE.id);
  assert.equal(response.action, 'ANSWER_CONTEXT');
  assert.equal(response.shouldStartDraft, false);
  assert.match(response.reply, /callback number/i);
  assert.match(response.reply, /nearby landmark/i);
});

check('returns registered reporting guidance without requesting a callback number', () => {
  const response = deterministicChatbotResponse({ message: 'How do I submit a report?', mode: 'IDLE', reporterMode: 'registered', draft: {} });
  assert.equal(response.replyKey, CHATBOT_4_REPORTING_GUIDE.id);
  assert.equal(response.shouldStartDraft, false);
  assert.match(response.reply, /verified account contact/i);
  assert.doesNotMatch(response.reply, /callback number/i);
});

check('preserves a pending report slot after a reporting-guidance question', () => {
  const response = deterministicChatbotResponse({ message: 'Ano ang proseso?', mode: 'DRAFT', reporterMode: 'guest', draft: { pendingSlot: 'location' } });
  assert.equal(response.action, 'ANSWER_CONTEXT');
  assert.equal(response.nextSlot, 'location');
  assert.equal(response.resumePending, true);
});

check('classifies reviewed aliases using existing confirmation-first categories', () => {
  const cases = [
    ['Tumaob yung motor', 'Vehicular Collision'],
    ['Makapal yung usok', 'Fire Emergency'],
    ['May allergic reaction siya', 'Medical Emergency'],
    ['May malaking crack sa pader', 'Structural Failure'],
    ['Na-stranded kami sa baha', 'Flood/Water'],
    ['May nangyari dito pero hindi namin alam kung ano', 'Unknown Cause'],
    ['Need ambulance papuntang hospital', 'Patient Transport'],
    ['Hindi naman emergency pero need namin ng help', 'Other / non-emergency request'],
  ] as const;
  for (const [message, incidentType] of cases) {
    const response = deterministicChatbotResponse({ message, mode: 'IDLE', reporterMode: 'guest', draft: {} });
    assert.equal(response.action, 'START_REPORT');
    assert.equal(response.slotUpdates.incidentType, incidentType);
    assert.equal(response.shouldStartDraft, true);
  }
});

check('does not turn an ambiguous non-emergency concern into a report', () => {
  const response = deterministicChatbotResponse({ message: 'May concern lang po ako', mode: 'IDLE', reporterMode: 'guest', draft: {} });
  assert.notEqual(response.action, 'START_REPORT');
});

check('keeps raw Chatbot-4 content and sensitive input out of the provider boundary', () => {
  const routeSource = fs.readFileSync(path.join(process.cwd(), 'app/api/chatbot/respond/route.ts'), 'utf8');
  assert.doesNotMatch(routeSource, /Chatbot-4\.md/);
  assert.equal(prepareProviderMessage('My callback is 09171234567 near Barangay Tiaong'), null);
  assert.ok(KNOWLEDGE_CATALOG.some((entry) => entry.id === CHATBOT_4_REPORTING_GUIDE.id && entry.source === 'Chatbot-4.md'));
});

console.log('Chatbot-4 context verification passed.');
