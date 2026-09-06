export function normalizePhilippinePhone(value: string): string {
  let cleaned = value.replace(/[^\d+]/g, '').trim();
  if (cleaned.startsWith('+63')) cleaned = `0${cleaned.slice(3)}`;
  else if (cleaned.startsWith('63')) cleaned = `0${cleaned.slice(2)}`;
  else if (cleaned.length === 10 && cleaned.startsWith('9')) cleaned = `0${cleaned}`;
  return cleaned;
}

export function isValidPhilippinePhone(value: string): boolean {
  return /^09\d{9}$/.test(normalizePhilippinePhone(value));
}
