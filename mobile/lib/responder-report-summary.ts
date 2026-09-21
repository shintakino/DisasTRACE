export function normalizeResponderDistanceKm(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function formatResponderDistanceKm(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value.toFixed(1)
    : '—';
}
