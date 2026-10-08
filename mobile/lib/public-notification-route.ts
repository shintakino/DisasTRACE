import type { EmergencyReportType } from '../store/use-emergency-report-store';

export type PublicNotificationRoute =
  | { pathname: '/(tabs)'; details?: undefined }
  | { pathname: '/(tabs)/profile'; details?: undefined }
  | { pathname: '/(tabs)/map'; details?: undefined }
  | { pathname: '/(tabs)/reports'; details?: undefined }
  | { pathname: `/(tabs)/reports/${string}`; details?: undefined }
  | {
      pathname: '/help/tracking' | '/help/response-status';
      details: Pick<EmergencyReportType, 'id' | 'incidentId' | 'trackingRequestId' | 'reporterMode'>;
    };

export interface PublicNotificationRouteInput {
  type?: unknown;
  kind?: unknown;
  metadata?: unknown;
}

interface NotificationMetadata {
  incidentId?: unknown;
  requestId?: unknown;
  trackingRequestId?: unknown;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getMetadata(value: unknown): NotificationMetadata | null {
  return value && typeof value === 'object' ? value as NotificationMetadata : null;
}

function getTrackingDetails(metadata: unknown): PublicNotificationRoute['details'] | null {
  const values = getMetadata(metadata);
  const incidentId = asNonEmptyString(values?.incidentId);
  const requestId = asNonEmptyString(values?.trackingRequestId) ?? asNonEmptyString(values?.requestId);
  if (!incidentId || !requestId) return null;

  return {
    id: requestId,
    incidentId,
    trackingRequestId: requestId,
    reporterMode: 'resident',
  };
}

/**
 * Resolves only valid, public-user destinations. Operational responder
 * notifications are intentionally handled by the responder resolver instead.
 * Missing or stale metadata always falls back to Home rather than constructing
 * a dynamic route with an incompatible identifier.
 */
export function resolvePublicNotificationRoute(
  input: PublicNotificationRouteInput,
): PublicNotificationRoute | null {
  const type = asNonEmptyString(input.type) ?? asNonEmptyString(input.kind);
  if (!type) return null;

  if (type === 'ambulance_dispatched') {
    const details = getTrackingDetails(input.metadata);
    return details ? { pathname: '/help/tracking', details } : { pathname: '/(tabs)' };
  }

  if (type === 'responder_arrived') {
    const details = getTrackingDetails(input.metadata);
    return details ? { pathname: '/help/response-status', details } : { pathname: '/(tabs)' };
  }

  if (type === 'incident_resolved' || type === 'incident_rejected') {
    // The notification stores the verification request ID. The detail API
    // accepts it and independently confirms ownership for the signed-in user.
    const requestId = asNonEmptyString(getMetadata(input.metadata)?.requestId);
    return requestId
      ? { pathname: `/(tabs)/reports/${encodeURIComponent(requestId)}` }
      : { pathname: '/(tabs)/reports' };
  }

  if (type === 'registration_approved' || type === 'registration_rejected') {
    return { pathname: '/(tabs)/profile' };
  }

  if (type === 'pagasa_alert') return { pathname: '/(tabs)/map' };
  if (type === 'incident_verified') return { pathname: '/(tabs)' };

  return null;
}
