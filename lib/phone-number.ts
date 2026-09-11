/**
 * Canonicalize the two supported Philippine mobile number forms so a guest
 * cannot receive a separate quota by switching between 09xx and +639xx.
 */
export function normalizePhilippineMobileNumber(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, '');
  return compact.startsWith('+63') ? `0${compact.slice(3)}` : compact;
}

export function samePhilippineMobileNumber(first: string | null | undefined, second: string | null | undefined) {
  return Boolean(first && second && normalizePhilippineMobileNumber(first) === normalizePhilippineMobileNumber(second));
}

/** Includes the legacy +63 representation stored before canonicalization. */
export function philippineMobileNumberVariants(value: string) {
  const normalized = normalizePhilippineMobileNumber(value);
  return normalized.startsWith('0')
    ? [normalized, `+63${normalized.slice(1)}`]
    : [normalized];
}

/** Reject obviously fabricated phone numbers without attempting carrier validation. */
export function isObviouslySyntheticPhilippineMobileNumber(value: string) {
  const normalized = normalizePhilippineMobileNumber(value);
  if (!/^09\d{9}$/.test(normalized)) return false;

  // Remove the 09 prefix. This catches 09123456789, 09999999999, and common
  // repeated blocks such as 09123123123 without rejecting ordinary numbers.
  const subscriberDigits = normalized.slice(2);
  if (/^(\d)\1{8}$/.test(subscriberDigits) || /^(\d{3})\1{2}$/.test(subscriberDigits)) return true;

  const step = Number(subscriberDigits[1]) - Number(subscriberDigits[0]);
  if (step !== 1 && step !== -1) return false;
  return [...subscriberDigits].every((digit, index) => {
    if (index === 0) return true;
    return Number(digit) - Number(subscriberDigits[index - 1]) === step;
  });
}
