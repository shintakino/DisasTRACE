import type { ChatbotActiveReport, ChatbotDraft } from './chatbot-contracts';
import { useEmergencyReportStore } from '../store/use-emergency-report-store';

function severityFor(draft: ChatbotDraft): 'Low' | 'High' | 'Critical' {
  if (draft.victimCondition === 'Unconscious / critical') return 'Critical';
  return draft.nature === 'EMERGENCY' ? 'High' : 'Low';
}

export function syncChatbotReportToEmergencyStore(input: {
  draft: ChatbotDraft;
  activeReport: ChatbotActiveReport;
  submissionId: string;
}) {
  const { draft, activeReport, submissionId } = input;
  if (!draft.incidentType || !draft.peopleInvolved || draft.latitude === undefined || draft.longitude === undefined) return;
  useEmergencyReportStore.setState((state) => ({
    report: {
      ...state.report,
      id: activeReport.id,
      requestId: activeReport.displayId,
      incidentId: activeReport.incidentId,
      photoUri: draft.photoUri,
      incidentType: draft.incidentType,
      peopleInvolved: `${draft.peopleInvolved} Persons`,
      landmarks: draft.landmarks,
      latitude: draft.latitude,
      longitude: draft.longitude,
      severity: severityFor(draft),
      nature: draft.nature === 'NON-EMERGENCY' ? 'Non-emergency' : 'Emergency',
      victimCondition: draft.victimCondition,
      reporterMode: activeReport.reporterMode === 'guest' ? 'guest' : 'resident',
      guestAccessToken: activeReport.guestAccessToken,
      triageClassification: activeReport.triageClassification as never,
      isMergedDuplicate: activeReport.isMergedDuplicate,
      chatbotOrigin: true,
      chatbotSubmissionId: submissionId,
    },
  }));
}
