import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

check('required chatbot actions have visible disabled states', () => {
  const chatbot = source('mobile/app/help/chatbot.tsx');
  assert.match(chatbot, /styles\.primaryDisabled/);
  assert.match(chatbot, /styles\.sendButtonDisabled/);
  assert.match(chatbot, /disabled=\{waiting \|\| !composer\.trim\(\) \|\| !!pendingEvidence\}/);
  assert.match(chatbot, /primaryDisabled: \{ backgroundColor: '#CBD5E1' \}/);
  assert.match(chatbot, /sendButtonDisabled: \{ backgroundColor: '#CBD5E1' \}/);
});

check('chatbot lets a reporter change the category without losing the draft', () => {
  const chatbot = source('mobile/app/help/chatbot.tsx');
  assert.match(chatbot, /Change incident category/);
  assert.match(chatbot, /setChangingIncidentCategory\(true\)/);
  assert.match(chatbot, /returningFromCategoryChange/);
  assert.match(chatbot, /Incident category updated\. Your other report details were kept\./);
});

check('registration uses a controlled suffix picker and keeps prefilled address labels unrequired', () => {
  const step1 = source('mobile/components/auth/Step1.tsx');
  const step2 = source('mobile/components/auth/Step2.tsx');
  assert.match(step1, /const NAME_SUFFIXES/);
  assert.match(step1, /Choose name suffix/);
  assert.match(step1, /<Modal visible=\{suffixPickerVisible\}/);
  assert.match(step2, />Province<\/Text>/);
  assert.match(step2, />City \/ Municipality<\/Text>/);
  assert.doesNotMatch(step2, /Province \*<\/Text>/);
  assert.doesNotMatch(step2, /City \/ Municipality \*<\/Text>/);
});

check('public home support card uses the dashboard information treatment', () => {
  const home = source('mobile/app/(tabs)/index.tsx');
  assert.match(home, /bg-\[#EAF1FF\]/);
  assert.match(home, /bg-\[#D8E7FF\]/);
  assert.match(home, /Contact DisasTRACE support/);
});

check('public map explains hospital and location markers and stays flush to its section', () => {
  const map = source('mobile/app/(tabs)/map.tsx');
  assert.match(map, /Configured hospital/);
  assert.match(map, /Selected hospital/);
  assert.match(map, /Your live location/);
  assert.match(map, /border-t border-slate-200 flex-col/);
  assert.doesNotMatch(map, /rounded-t-\[32px\]/);
  assert.doesNotMatch(map, /shadow-2xl/);
});

console.log('All mobile public UI refinement checks passed.');
