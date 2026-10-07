const MANILA_TIME_ZONE = 'Asia/Manila';
const DAY_MS = 24 * 60 * 60 * 1000;
const MANILA_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

function parseTimestamp(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats an absolute API timestamp for the municipality's operational
 * timezone, independent of the handset's timezone setting.
 */
function formatManila(value: string | number | Date, options: Intl.DateTimeFormatOptions): string | null {
  const date = parseTimestamp(value);
  if (!date) return null;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIME_ZONE,
    ...options,
  }).format(date);
}

export function formatManilaMobileDateTime(value: string | number | Date): string | null {
  return formatManila(value, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatManilaMobileTime(value: string | number | Date): string | null {
  return formatManila(value, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns Manila-calendar day bounds as absolute instants for API filtering.
 * Manila has no daylight-saving offset, so the fixed UTC+08 conversion is
 * stable and does not depend on the responder handset's timezone.
 */
export function manilaCalendarDateBounds(days: number, now = new Date()): { createdAfter: string; createdBefore: string } {
  const dayCount = Math.max(1, Math.floor(days));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  const year = part('year');
  const month = part('month');
  const day = part('day');

  if (![year, month, day].every(Number.isFinite)) {
    throw new Error('Unable to determine the current Manila calendar day');
  }

  const startOfTomorrowManila = Date.UTC(year, month - 1, day + 1) - MANILA_UTC_OFFSET_MS;
  return {
    createdAfter: new Date(startOfTomorrowManila - dayCount * DAY_MS).toISOString(),
    createdBefore: new Date(startOfTomorrowManila).toISOString(),
  };
}
