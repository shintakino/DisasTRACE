import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');

const responseStatus = source('mobile/app/help/response-status.tsx');
assert.match(responseStatus, /const isLeavingRef = useRef\(false\)/, 'Return Home needs a navigation-race guard.');
assert.match(responseStatus, /isLeavingRef\.current = true/, 'Return Home must disable late refresh work before state is cleared.');
assert.match(responseStatus, /!mounted \|\| isLeavingRef\.current/, 'Late status responses must not update a departed screen.');
assert.match(
  responseStatus,
  /isLeavingRef\.current = true[\s\S]*resetReport\(\)[\s\S]*clearReportToIdle\(\)[\s\S]*router\.replace/,
  'Return Home must clear completed workflow state under the leaving guard before mounting Home.',
);

const tracking = source('mobile/app/help/tracking.tsx');
assert.match(tracking, /event\.nativeEvent\.userInteraction/, 'MapLibre user camera interaction must use its typed native event property.');
assert.doesNotMatch(tracking, /properties\?\.isUserGesture/, 'The unsupported map gesture property must not keep the camera locked.');

const step2 = source('mobile/components/auth/Step2.tsx');
assert.match(step2, /contentContainerStyle=\{\{ flexGrow: 1, justifyContent: 'flex-end' \}\}/, 'The OTP sheet must remain scrollable above a resized keyboard.');
assert.match(step2, /keyboardShouldPersistTaps="handled"/, 'OTP controls must remain usable while the keyboard is open.');
assert.match(step2, /Platform\.OS === 'ios' \? 'padding' : 'height'/, 'The OTP modal must resize above the Android keyboard in its own native window.');

const forgotPassword = source('mobile/app/(auth)/forgot-password.tsx');
assert.match(forgotPassword, /placeholder="Email or mobile number"/, 'The recovery input placeholder must fit narrow Android viewports.');
assert.match(forgotPassword, /Example: name@example\.com or 09XXXXXXXXX/, 'Recovery format guidance must remain visible outside the non-wrapping placeholder.');

const signUp = source('mobile/app/(auth)/sign-up.tsx');
assert.match(signUp, /SignUpPayloadSchema\.safeParse\(currentData\)/, 'The complete registration payload must be validated before Auth is called.');
assert.match(signUp, /const registrationData = registration\.data/, 'Only validated values may be sent to Auth.');
assert.match(signUp, /!registrationData\.privacyConsentAt \|\| !registrationData\.privacyPolicyVersion/, 'Required privacy-consent metadata must be checked before Auth signup.');
assert.match(signUp, /email: registrationData\.email/, 'Invalid email data must not reach Auth signup.');
assert.doesNotMatch(signUp, /email: currentData\.email/, 'Raw cross-step email data must not reach Auth signup.');
assert.match(signUp, /let accountCreated = false/, 'Registration must distinguish a pre-account failure from a resumable post-account upload failure.');
assert.match(signUp, /router\.replace\('\/\(verification\)\/pending' as never\)/, 'A failed post-signup ID upload must continue to Pending Verification rather than invite a duplicate registration.');

console.log('Public mobile reliability checks passed.');
