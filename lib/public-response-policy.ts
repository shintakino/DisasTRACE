export type PublicResponseStatus = 'WAITING' | 'INBOUND_TRACKING' | 'COMPLETED_AT_SCENE' | 'REJECTED';

export interface PublicResponseLifecycleInput {
  requestStatus?: string | null;
  incidentStatus?: string | null;
  responderId?: string | null;
}

export interface PublicResponseLifecycleProjection {
  status: PublicResponseStatus;
  trackingActive: boolean;
  responseComplete: boolean;
}

/**
 * Projects the operational response state into the reporter-visible lifecycle.
 * Scene arrival is monotonic and terminal for public tracking even while the
 * responder continues hospital transport or documentation internally.
 */
export function projectPublicResponseLifecycle(
  input: PublicResponseLifecycleInput,
): PublicResponseLifecycleProjection {
  if (input.requestStatus === 'REJECTED') {
    return { status: 'REJECTED', trackingActive: false, responseComplete: false };
  }

  if (
    input.incidentStatus === 'ARRIVED'
    || input.incidentStatus === 'DOCUMENTATION_PENDING'
    || input.incidentStatus === 'RESOLVED'
  ) {
    return { status: 'COMPLETED_AT_SCENE', trackingActive: false, responseComplete: true };
  }

  const trackingActive = Boolean(
    input.responderId
    && (input.incidentStatus === 'DISPATCHED' || input.incidentStatus === 'EN_ROUTE'),
  );
  return {
    status: trackingActive ? 'INBOUND_TRACKING' : 'WAITING',
    trackingActive,
    responseComplete: false,
  };
}
