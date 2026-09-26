export type ResponderOperationalStatus =
  | 'idle'
  | 'dispatch_offered'
  | 'en_route'
  | 'on_scene'
  | 'to_hospital'
  | 'at_hospital'
  | 'report_filling';

export type ResponderFieldOutcome =
  | 'HANDLED_ON_SCENE'
  | 'PATIENT_REFUSED'
  | 'HOSPITAL_ARRIVAL';

export type ReportFormSource = 'ACTIVE_DISPATCH' | 'DOCUMENTATION_DRAFT';

export interface ReportFormSession<TIncident> {
  incident: TIncident;
  source: ReportFormSource;
  draftId: string | null;
  returnStatus: ResponderOperationalStatus | null;
}

export function createReportFormSession<TIncident>(
  incident: TIncident,
  source: ReportFormSource,
  draftId?: string,
  returnStatus?: ResponderOperationalStatus,
): ReportFormSession<TIncident> {
  return {
    incident,
    source,
    draftId: draftId ?? null,
    returnStatus: returnStatus ?? null,
  };
}

export function getReportFormCloseStatus<TIncident extends { id: string }>({
  session,
  currentStatus,
  fieldOutcome,
  activeDispatchId,
}: {
  session: ReportFormSession<TIncident>;
  currentStatus: ResponderOperationalStatus;
  fieldOutcome: ResponderFieldOutcome | null;
  activeDispatchId: string | null;
}): ResponderOperationalStatus {
  if (session.source === 'DOCUMENTATION_DRAFT' || session.incident.id !== activeDispatchId) {
    return currentStatus;
  }
  if (session.returnStatus && session.returnStatus !== 'report_filling') {
    return session.returnStatus;
  }
  if (fieldOutcome === 'HOSPITAL_ARRIVAL') return 'at_hospital';
  if (fieldOutcome) return 'on_scene';
  return 'idle';
}

export function shouldClearActiveDispatchAfterReport<TIncident extends { id: string }>(
  session: ReportFormSession<TIncident> | null,
  activeDispatchId: string | null,
): boolean {
  return Boolean(
    session
    && session.source === 'ACTIVE_DISPATCH'
    && session.incident.id === activeDispatchId,
  );
}

const INCIDENT_TRACKING_STATES = new Set<ResponderOperationalStatus>([
  'dispatch_offered',
  'en_route',
  'on_scene',
  'to_hospital',
  'at_hospital',
]);

export function getOperationalTrackingIncidentId(
  {
    status,
    activeDispatchId,
    formSource,
  }: {
    status: ResponderOperationalStatus;
    activeDispatchId: string | null;
    formSource: ReportFormSource | null;
  },
): string | null {
  if (!activeDispatchId) return null;
  const isActiveReportForm = status === 'report_filling' && formSource === 'ACTIVE_DISPATCH';
  if (!INCIDENT_TRACKING_STATES.has(status) && !isActiveReportForm) return null;
  return activeDispatchId;
}
