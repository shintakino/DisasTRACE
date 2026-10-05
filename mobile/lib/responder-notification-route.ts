export type ResponderNotificationRoute =
  | { pathname: '/(tabs)'; params?: { dispatchOfferId: string } }
  | { pathname: '/(tabs)/reports' };

export interface ResponderNotificationRouteInput {
  type?: unknown;
  kind?: unknown;
  incidentId?: unknown;
  metadata?: unknown;
}

interface NotificationMetadata {
  incidentId?: unknown;
}

const OFFER_KINDS = new Set([
  'dispatch_offer',
  'dispatch_alert',
  'new_incident',
  'manual_dispatch_offered',
]);

const HOME_KINDS = new Set([
  'active_dispatch',
  'dispatch_accepted',
  'manual_dispatch_accepted',
  'dispatch_offer_expired',
  'manual_dispatch_rejected',
]);

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function incidentIdFrom(input: ResponderNotificationRouteInput): string | null {
  const directIncidentId = asNonEmptyString(input.incidentId);
  if (directIncidentId) return directIncidentId;

  const metadata = input.metadata;
  if (!metadata || typeof metadata !== 'object') return null;
  return asNonEmptyString((metadata as NotificationMetadata).incidentId);
}

/**
 * Resolves responder operational notifications to valid internal Expo routes.
 * No caller should open the app's URL scheme directly for these notifications:
 * the exact offer is hydrated on Home through its server-authorized API.
 */
export function resolveResponderNotificationRoute(
  input: ResponderNotificationRouteInput,
): ResponderNotificationRoute | null {
  const kind = asNonEmptyString(input.kind) ?? asNonEmptyString(input.type);
  if (!kind) return null;

  if (kind === 'report_audited') {
    return { pathname: '/(tabs)/reports' };
  }

  if (OFFER_KINDS.has(kind)) {
    const incidentId = incidentIdFrom(input);
    return incidentId
      ? { pathname: '/(tabs)', params: { dispatchOfferId: incidentId } }
      : { pathname: '/(tabs)' };
  }

  if (HOME_KINDS.has(kind)) {
    return { pathname: '/(tabs)' };
  }

  return null;
}
