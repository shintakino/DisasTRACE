export type DuplicateMergeRequest = {
  id: string;
  status: string;
  nature: string;
  type: string;
  parentRequestId?: string | null;
  incident?: { status: string } | null;
};

/** A duplicate may not absorb an incident that already has its own response. */
export function canBeMergedAsDuplicate(request: DuplicateMergeRequest) {
  return request.status === 'PENDING'
    && request.nature === 'EMERGENCY'
    && !request.parentRequestId
    && !request.incident;
}

/**
 * PACC may choose an unclosed report of the same emergency type as the primary
 * report. Pending suspicious reports are intentionally valid parents: PACC
 * must still review/classify that one report before it is dispatched.
 */
export function canBeDuplicateMergeParent(
  candidate: DuplicateMergeRequest,
  duplicate: Pick<DuplicateMergeRequest, 'id' | 'type'>,
) {
  return candidate.id !== duplicate.id
    && !candidate.parentRequestId
    && candidate.nature === 'EMERGENCY'
    && candidate.type === duplicate.type
    && (candidate.status === 'PENDING' || candidate.status === 'VERIFIED')
    && candidate.incident?.status !== 'RESOLVED';
}
