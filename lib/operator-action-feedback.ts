export type ActionFeedbackPhase = 'processing' | 'success' | 'error';

export interface OperatorActionFeedback {
  phase: ActionFeedbackPhase;
  title: string;
  detail: string;
  nextStep: string;
  userAction: string;
}

export function createActionProcessingFeedback(title: string, detail: string): OperatorActionFeedback {
  return {
    phase: 'processing',
    title,
    detail,
    nextStep: 'Wait for server confirmation before taking another action.',
    userAction: 'Keep this report open.',
  };
}

export function createActionSuccessFeedback(input: Omit<OperatorActionFeedback, 'phase'>): OperatorActionFeedback {
  return { phase: 'success', ...input };
}

export function createActionErrorFeedback(title: string, detail: string): OperatorActionFeedback {
  return {
    phase: 'error',
    title,
    detail,
    nextStep: 'The report was not changed.',
    userAction: 'Review the reason, then try again or refresh the queue.',
  };
}
