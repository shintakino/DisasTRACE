import type { ChatbotReporterMode } from './chatbot-contracts';

export interface PublicHomeNavigationPlan {
  route: '/' | '/(tabs)';
  preservesActiveReport: boolean;
}

/**
 * Leaves a submitted report available for its authorized status/history flow
 * while performing exactly one navigation transition to the reporter's home.
 */
export function getPublicHomeNavigationPlan(reporterMode: ChatbotReporterMode): PublicHomeNavigationPlan {
  return {
    route: reporterMode === 'guest' ? '/' : '/(tabs)',
    preservesActiveReport: true,
  };
}
