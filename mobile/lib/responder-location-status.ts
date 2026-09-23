const SERVER_RESPONDER_STATUSES = new Set([
  'en_route',
  'on_scene',
  'to_hospital',
  'report_filling',
]);

/**
 * `idle`, `dispatch_offered`, and `at_hospital` are mobile UI states, not
 * responder-location API states. Omitting them keeps an on-duty GPS heartbeat
 * valid without inventing a field-workflow transition on the server.
 */
export function responderLocationStatusPayload(status: unknown) {
  return typeof status === 'string' && SERVER_RESPONDER_STATUSES.has(status)
    ? { responderStatus: status }
    : {};
}

export function normalizeResponderLocationPayload<T extends Record<string, unknown>>(payload: T) {
  const { responderStatus, ...rest } = payload;
  return {
    ...rest,
    ...responderLocationStatusPayload(responderStatus),
  };
}
