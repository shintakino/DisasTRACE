export interface ResponderOperation {
  ownerUserId: string | null;
  incidentId: string;
}

/** Results from an earlier account or incident cannot mutate the current response. */
export function isCurrentResponderOperation(
  operation: ResponderOperation,
  state: { ownerUserId: string | null; activeDispatch: { id: string } | null },
) {
  return operation.ownerUserId === state.ownerUserId
    && operation.incidentId === state.activeDispatch?.id;
}
