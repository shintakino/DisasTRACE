import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PasswordSchema } from '../mobile/schemas/auth';

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, 'mobile/schemas/auth.ts'), 'utf8');
const step = fs.readFileSync(path.join(root, 'mobile/components/auth/Step4.tsx'), 'utf8');
const signUp = fs.readFileSync(path.join(root, 'mobile/app/(auth)/sign-up.tsx'), 'utf8');

assert.match(schema, /privacyPolicyAccepted: z\.boolean\(\)\.refine\(val => val === true/, 'Privacy consent must be an explicit required form value.');
assert.match(step, /I have read and freely consent to the Data Privacy Policy\./, 'The sign-up UI must use explicit data privacy consent wording.');
assert.match(step, /getMobileApiBaseUrl\(\)/, 'The privacy policy must use the production-safe mobile API origin.');
assert.match(step, /Registration is unavailable until the current policy can be displayed\./, 'Registration must not silently accept an unavailable current policy.');
assert.match(signUp, /privacy_policy_accepted: currentData\.privacyPolicyAccepted/, 'The registration metadata must retain the explicit consent flag.');

const completePasswordStep = {
  password: 'correct-horse-battery-staple',
  confirmPassword: 'correct-horse-battery-staple',
  termsAccepted: true,
  privacyPolicyAccepted: true,
};
assert.equal(PasswordSchema.safeParse(completePasswordStep).success, true, 'A complete password step with explicit privacy consent must validate.');
assert.equal(
  PasswordSchema.safeParse({ ...completePasswordStep, privacyPolicyAccepted: false }).success,
  false,
  'The password step must reject registration without explicit privacy consent.',
);

console.log('Mobile Data Privacy consent regression checks passed.');
