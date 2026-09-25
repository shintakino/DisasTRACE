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

export type ManilaRecentReportRange = 'today' | 'last_7_days' | 'last_30_days';

/** Calendar-day bounds for a resident's own report history in Asia/Manila. */
export function manilaRecentReportBounds(range: ManilaRecentReportRange) {
  const offsetDays = {
    today: 0,
    last_7_days: 6,
    last_30_days: 29,
  }[range];
  return {
    start: sql`((date_trunc('day', now() AT TIME ZONE ${MANILA_TIME_ZONE}) - (${offsetDays} * interval '1 day')) AT TIME ZONE ${MANILA_TIME_ZONE})`,
    end: sql`((date_trunc('day', now() AT TIME ZONE ${MANILA_TIME_ZONE}) + interval '1 day') AT TIME ZONE ${MANILA_TIME_ZONE})`,
  };
}

export type ManilaOperationalPeriod = 'today' | 'weekly' | 'monthly' | 'yearly';

/**
 * SQL bounds for the Map's operational review periods. The start is always
 * calculated in Manila time, while the end is the current instant so a period
 * never includes future records when the database is configured for another
 * time zone.
 */
export function manilaOperationalPeriodBounds(period: ManilaOperationalPeriod) {
  const start = {
    today: sql`(date_trunc('day', now() AT TIME ZONE ${MANILA_TIME_ZONE}) AT TIME ZONE ${MANILA_TIME_ZONE})`,
    weekly: sql`(date_trunc('week', now() AT TIME ZONE ${MANILA_TIME_ZONE}) AT TIME ZONE ${MANILA_TIME_ZONE})`,
    monthly: sql`(date_trunc('month', now() AT TIME ZONE ${MANILA_TIME_ZONE}) AT TIME ZONE ${MANILA_TIME_ZONE})`,
    yearly: sql`(date_trunc('year', now() AT TIME ZONE ${MANILA_TIME_ZONE}) AT TIME ZONE ${MANILA_TIME_ZONE})`,
  }[period];

  return { start, end: sql`now()` };
}
