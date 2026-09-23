import { sql } from 'drizzle-orm';

const MANILA_TIME_ZONE = 'Asia/Manila';
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a UTC instant as the operational calendar date in Baliwag. */
export function manilaCalendarDate(at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === kind)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/**
 * PostgreSQL timestamptz bounds for a specific Manila calendar day. This
 * keeps server and database time zones from changing operational day metrics.
 */
export function manilaDayBounds(day: string) {
  if (!ISO_DAY.test(day)) throw new Error('Expected a calendar date formatted YYYY-MM-DD.');
  return {
    start: sql`(${day}::date::timestamp AT TIME ZONE ${MANILA_TIME_ZONE})`,
    end: sql`((${day}::date + interval '1 day') AT TIME ZONE ${MANILA_TIME_ZONE})`,
  };
}

/** PostgreSQL timestamptz bounds for today in Asia/Manila. */
export function currentManilaDayBounds() {
  return {
    start: sql`(date_trunc('day', now() AT TIME ZONE ${MANILA_TIME_ZONE}) AT TIME ZONE ${MANILA_TIME_ZONE})`,
    end: sql`((date_trunc('day', now() AT TIME ZONE ${MANILA_TIME_ZONE}) + interval '1 day') AT TIME ZONE ${MANILA_TIME_ZONE})`,
  };
}
