/**
 * The database is the authority for a dispatch-offer expiry. This small client
 * buffer prevents the app from inviting a responder to start an Accept request
 * that is very likely to arrive after that server deadline.
 */
export const DISPATCH_ACCEPTANCE_SAFETY_BUFFER_MS = 3_000;

export function canAttemptDispatchAcceptance(
  expiresAtMs: number,
  currentServerTimeMs: number,
) {
  return Number.isFinite(expiresAtMs)
    && expiresAtMs - currentServerTimeMs > DISPATCH_ACCEPTANCE_SAFETY_BUFFER_MS;
}
