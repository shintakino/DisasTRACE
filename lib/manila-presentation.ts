export const MANILA_TIME_ZONE = "Asia/Manila";

type TimestampInput = Date | number | string;

function toDate(value: TimestampInput): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Expected a valid timestamp for Manila presentation.");
  }
  return date;
}

/** Formats an operational timestamp as a Baliwag calendar date. */
export function formatManilaDate(value: TimestampInput): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(toDate(value));
}

/** Formats an operational timestamp as a Baliwag 12-hour clock time. */
export function formatManilaTime(value: TimestampInput): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(value));
}

/** Formats an operational timestamp as one explicit Baliwag date and time. */
export function formatManilaDateTime(value: TimestampInput): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(toDate(value));
}
