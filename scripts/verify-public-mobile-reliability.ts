import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (file: string) => readFileSync(file, 'utf8');

const responseStatus = source('mobile/app/help/response-status.tsx');
assert.match(responseStatus, /const isLeavingRef = useRef\(false\)/, 'Return Home needs a navigation-race guard.');
assert.match(responseStatus, /isLeavingRef\.current = true/, 'Return Home must disable late refresh work before state is cleared.');
assert.match(responseStatus, /!mounted \|\| isLeavingRef\.current/, 'Late status responses must not update a departed screen.');

const tracking = source('mobile/app/help/tracking.tsx');
assert.match(tracking, /event\.nativeEvent\.userInteraction/, 'MapLibre user camera interaction must use its typed native event property.');
assert.doesNotMatch(tracking, /properties\?\.isUserGesture/, 'The unsupported map gesture property must not keep the camera locked.');

const step2 = source('mobile/components/auth/Step2.tsx');
assert.match(step2, /contentContainerStyle=\{\{ flexGrow: 1, justifyContent: 'flex-end' \}\}/, 'The OTP sheet must remain scrollable above a resized keyboard.');
assert.match(step2, /keyboardShouldPersistTaps="handled"/, 'OTP controls must remain usable while the keyboard is open.');
assert.match(step2, /Platform\.OS === 'ios' \? 'padding' : undefined/, 'Android must rely on its configured resize behavior instead of a competing keyboard offset.');

const signUp = source('mobile/app/(auth)/sign-up.tsx');
assert.match(signUp, /SignUpPayloadSchema\.safeParse\(currentData\)/, 'The complete registration payload must be validated before Auth is called.');
assert.match(signUp, /const registrationData = registration\.data/, 'Only validated values may be sent to Auth.');
assert.match(signUp, /!registrationData\.privacyConsentAt \|\| !registrationData\.privacyPolicyVersion/, 'Required privacy-consent metadata must be checked before Auth signup.');
assert.match(signUp, /email: registrationData\.email/, 'Invalid email data must not reach Auth signup.');
assert.doesNotMatch(signUp, /email: currentData\.email/, 'Raw cross-step email data must not reach Auth signup.');

console.log('Public mobile reliability checks passed.');
