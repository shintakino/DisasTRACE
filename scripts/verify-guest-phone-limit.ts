import assert from 'node:assert/strict';
import { DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT, hashGuestDeviceId, hasReachedGuestReportLimit } from '../lib/guest-report-limit';
import {
  normalizePhilippineMobileNumber,
  isObviouslySyntheticPhilippineMobileNumber,
  philippineMobileNumberVariants,
  samePhilippineMobileNumber,
} from '../lib/phone-number';

assert.equal(normalizePhilippineMobileNumber('+63 917-123-4567'), '09171234567');
assert.equal(normalizePhilippineMobileNumber('0917 123 4567'), '09171234567');
assert.equal(samePhilippineMobileNumber('+639171234567', '09171234567'), true);
assert.deepEqual(philippineMobileNumberVariants('09171234567'), ['09171234567', '+639171234567']);
assert.equal(hasReachedGuestReportLimit(DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT - 1, DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT), false);
assert.equal(hasReachedGuestReportLimit(DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT, DEFAULT_GUEST_REPORTS_PER_PHONE_LIMIT), true);
assert.notEqual(hashGuestDeviceId('android-device-a'), 'android-device-a');
assert.equal(hashGuestDeviceId('android-device-a').length, 64);
assert.equal(isObviouslySyntheticPhilippineMobileNumber('09123456789'), true);
assert.equal(isObviouslySyntheticPhilippineMobileNumber('09999999999'), true);
assert.equal(isObviouslySyntheticPhilippineMobileNumber('09171234567'), false);

console.log('Guest phone lifetime limit checks passed.');
