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
