export type RosterAccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED';

/** Keep the administrative account state truthful in the responder roster. */
export function normalizeRosterAccountStatus(status: RosterAccountStatus): RosterAccountStatus {
  return status;
}
