const PHONE = /(?:\+63|0)9\d[\s()-]*\d{3}[\s()-]*\d{4}/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const COORDINATES = /\b-?\d{1,2}\.\d{3,}\s*[,/]\s*-?\d{2,3}\.\d{3,}\b/;
const LOCATION_OR_IDENTITY = /\b(my name is|ako si|barangay|brgy\.?|street|st\.?|road|rd\.?|landmark|address|location is|located at|gps|latitude|longitude)\b/i;
const REPORT_CREDENTIAL = /\bREQ-\d{4}-\d{4,}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|\b[0-9a-f]{64,128}\b/i;
const URL = /https?:\/\/\S+/i;

/**
 * Provider calls are optional. If a message may carry identity or location
 * details, keep it entirely inside DisasTRACE and use deterministic fallback.
 */
export function prepareProviderMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed || PHONE.test(trimmed) || EMAIL.test(trimmed) || COORDINATES.test(trimmed)
    || LOCATION_OR_IDENTITY.test(trimmed) || REPORT_CREDENTIAL.test(trimmed) || URL.test(trimmed)) return null;
  return trimmed;
}
