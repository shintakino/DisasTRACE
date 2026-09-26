import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createReportFormSession,
  getOperationalTrackingIncidentId,
  getReportFormCloseStatus,
  shouldClearActiveDispatchAfterReport,
} from '../mobile/lib/responder-report-form-session';

const draftIncident = { id: 'incident-draft' };
const liveIncident = { id: 'incident-live' };

const draftSession = createReportFormSession(draftIncident, 'DOCUMENTATION_DRAFT', 'draft-1');
assert.equal(draftSession.incident, draftIncident);
assert.equal(draftSession.source, 'DOCUMENTATION_DRAFT');
assert.equal(draftSession.draftId, 'draft-1');
assert.equal(draftSession.returnStatus, null);

assert.equal(
  getReportFormCloseStatus({
    session: draftSession,
    currentStatus: 'en_route',
    fieldOutcome: null,
    activeDispatchId: liveIncident.id,
  }),
  'en_route',
  'Closing an older documentation draft must preserve a newer live dispatch state.',
);
assert.equal(
  shouldClearActiveDispatchAfterReport(draftSession, liveIncident.id),
  false,
  'Submitting an older documentation draft must not clear a newer live dispatch.',
);

const activeSession = createReportFormSession(liveIncident, 'ACTIVE_DISPATCH');
assert.equal(
  getReportFormCloseStatus({
    session: activeSession,
    currentStatus: 'report_filling',
    fieldOutcome: 'HOSPITAL_ARRIVAL',
    activeDispatchId: liveIncident.id,
  }),
  'at_hospital',
);
assert.equal(shouldClearActiveDispatchAfterReport(activeSession, liveIncident.id), true);

const activeOnSceneSession = createReportFormSession(
  liveIncident,
  'ACTIVE_DISPATCH',
  undefined,
  'on_scene',
);
assert.equal(
  getReportFormCloseStatus({
    session: activeOnSceneSession,
    currentStatus: 'report_filling',
    fieldOutcome: null,
    activeDispatchId: liveIncident.id,
  }),
  'on_scene',
  'Closing an active report must return to the field state that opened it.',
);

assert.equal(getOperationalTrackingIncidentId({
  status: 'en_route',
  activeDispatchId: liveIncident.id,
  formSource: null,
}), liveIncident.id);
assert.equal(getOperationalTrackingIncidentId({
  status: 'report_filling',
  activeDispatchId: liveIncident.id,
  formSource: 'ACTIVE_DISPATCH',
}), liveIncident.id);
assert.equal(getOperationalTrackingIncidentId({
  status: 'report_filling',
  activeDispatchId: draftIncident.id,
  formSource: 'DOCUMENTATION_DRAFT',
}), null);
assert.equal(getOperationalTrackingIncidentId({
  status: 'idle',
  activeDispatchId: draftIncident.id,
  formSource: 'DOCUMENTATION_DRAFT',
}), null);

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const store = read('mobile/stores/useResponderStore.ts');
const form = read('mobile/components/responder/IncidentReportForm.tsx');
const tracker = read('mobile/app/(tabs)/_layout.tsx');
const authStatus = read('mobile/hooks/use-auth-status.ts');
const formsScreen = read('mobile/app/(tabs)/forms.tsx');
const responderHome = read('mobile/components/responder/ResponderHome.tsx');

assert.match(store, /reportFormSession: ReportFormSession<DispatchDetails> \| null/);
assert.match(store, /openFormForIncident: \(incident: DispatchDetails, draftId\?: string\) => void/);
assert.match(store, /closeReportForm: \(\) => void/);
assert.match(store, /clearReportFormSession: \(\) => void/);

const openDraftAction = store.match(/openFormForIncident: \(incident, draftId\) => set\([\s\S]*?\n  \}\),/)?.[0] ?? '';
assert.match(openDraftAction, /reportFormSession:/);
assert.doesNotMatch(openDraftAction, /activeDispatch:|status:/);

assert.match(store, /clearTransientDispatch: \(\) => set\(\(state\) => \(\{[\s\S]*?reportFormSession: state\.reportFormSession\?\.source === 'ACTIVE_DISPATCH'/);
assert.match(store, /isSubmittingReport: state\.reportFormSession\?\.source === 'DOCUMENTATION_DRAFT'/);

assert.match(form, /visible=\{Boolean\(reportFormSession\)\}/);
assert.doesNotMatch(form, /visible=\{status === 'report_filling'\}/);
assert.match(form, /hydratedSessionKey === formSessionKey/);
assert.match(form, /responderStatus !== 'dispatch_offered'[\s\S]*?closeReportForm\(\)/);
assert.match(tracker, /getOperationalTrackingIncidentId/);
assert.match(tracker, /formSource: reportFormSession\?\.source \?\? null/);
assert.match(tracker, /\{isResponder && <IncidentReportForm \/>\}/);
assert.doesNotMatch(formsScreen, /<IncidentReportForm \/>/);
assert.doesNotMatch(responderHome, /<IncidentReportForm \/>/);
assert.match(authStatus, /clearReportFormSession\(\)/);

console.log('Responder draft form-session checks passed.');
