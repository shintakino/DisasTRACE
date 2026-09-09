const DETAIL_LABEL = /(?:^|\s+)(?=(?:Condition|Access|Time|Cause|Other):)/i;
const DETAIL_ONLY = /^(?:Condition|Access|Time|Cause|Other):/i;
const REJECTION_PREFIX = /^REJECTED:\s*[^.]+\.\s*/i;

/**
 * Formats the official barangay attributed from the report GPS coordinates.
 * Free-text landmarks are deliberately not used as a location label.
 */
export function formatOfficialBaliwagLocation(
  barangay: string | null | undefined,
  fallback = 'Location unavailable',
): string {
  const name = barangay?.trim();
  return name ? `${name}, Baliwag City` : fallback;
}

/**
 * Older mobile reports stored the location and follow-up answers in one
 * location_description value. Keep the raw value available for details, but
 * expose only the actual location anywhere a location field is rendered.
 */
export function getReportLocation(value: string | null | undefined, fallback = 'Baliwag City'): string {
  const raw = value?.trim();
  if (!raw) return fallback;

  const location = raw.replace(REJECTION_PREFIX, '').split(DETAIL_LABEL)[0]?.trim();
  if (!location || DETAIL_ONLY.test(location)) return fallback;
  return location;
}

export function getReportDetailText(value: string | null | undefined, fallback = 'No additional report details provided.'): string {
  const raw = value?.trim();
  return raw || fallback;
}
