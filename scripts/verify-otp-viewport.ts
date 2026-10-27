import assert from 'node:assert/strict';
import { keyboardViewportHeight, updateOtpDigits } from '../mobile/lib/otp-input';

assert.equal(keyboardViewportHeight(24, 760, null), 760);
assert.equal(keyboardViewportHeight(24, 760, 460), 436, 'Overlay keyboard excludes its actual occlusion.');
assert.equal(keyboardViewportHeight(24, 436, 460), 436, 'Already resized native window must not be reduced twice.');
assert.equal(keyboardViewportHeight(24, 200, 460), 200, 'Smaller layouts stay within their own viewport.');
assert.equal(keyboardViewportHeight(24, 760, 10), 0);
const empty = Array(6).fill('');
assert.deepEqual(updateOtpDigits(empty, 0, '123456'), ['1','2','3','4','5','6']);
assert.deepEqual(updateOtpDigits(empty, 3, '123456'), ['1','2','3','4','5','6'], 'Autofill replaces the whole code from any selected cell.');
assert.deepEqual(updateOtpDigits(empty, 4, '12x3'), ['','','','','1','2']);
assert.deepEqual(updateOtpDigits(['1','2','3','4','5','6'], 3, ''), ['1','2','3','','5','6']);
assert.deepEqual(empty, Array(6).fill(''), 'Input edits do not mutate the previous React state.');
console.log('PASS OTP overlay/resized keyboard geometry, paste/autofill, deletion, and numeric input');
