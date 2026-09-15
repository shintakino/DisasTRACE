import type { ChatbotReporterMode } from './chatbot-contracts';

const REJECTED_REPORT_ACTIONS = ['START_NEW_REPORT', 'HOME', 'CALL_PACC'] as const;

export interface RejectedReportTransitionInput {
  reporterMode: ChatbotReporterMode;
  rejectionReason: string;
}

export interface RejectedReportTransition {
  nextLifecycle: 'IDLE';
  shouldClearPersistedReport: true;
  canSubmitAgain: true;
  startNewReportRoute: '/help/chatbot?mode=guest' | '/help/chatbot?mode=resident';
  homeRoute: '/' | '/(tabs)';
  actions: [...typeof REJECTED_REPORT_ACTIONS];
  message: string;
}

/**
 * Produces the same terminal recovery behavior for guest and signed-in
 * reporters while retaining the correct fresh-report and home destinations.
 */
export function deriveRejectedReportTransition(
  input: RejectedReportTransitionInput,
): RejectedReportTransition {
  const rejectionReason = input.rejectionReason.trim().replace(/\s+/g, ' ')
    || 'No rejection reason was provided by PACC.';
  const isGuest = input.reporterMode === 'guest';

  return {
    nextLifecycle: 'IDLE',
    shouldClearPersistedReport: true,
    canSubmitAgain: true,
    startNewReportRoute: isGuest
      ? '/help/chatbot?mode=guest'
      : '/help/chatbot?mode=resident',
    homeRoute: isGuest ? '/' : '/(tabs)',
    actions: [...REJECTED_REPORT_ACTIONS],
    message: `PACC rejected this report. Reason: ${rejectionReason} You can submit a new report if emergency assistance is still needed.`,
  };
}
