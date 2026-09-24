const AMBULANCE_UNIT_ID_PATTERN = /^AMB-[A-Z0-9]{2,8}-[A-Z0-9]{2,8}$/;

export function normalizeAmbulanceUnitId(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase() || '';
  return normalized || null;
}

export function isValidAmbulanceUnitId(value: string | null | undefined): boolean {
  const normalized = normalizeAmbulanceUnitId(value);
  return normalized !== null && AMBULANCE_UNIT_ID_PATTERN.test(normalized);
}

export function legacyAmbulanceUnitId(fullName: string, userId: string): string {
  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3) || '001';
  const suffix = userId.replace(/[^A-Z0-9]/gi, '').slice(-8).toUpperCase() || '001';
  return `AMB-${initials}-${suffix}`;
}
