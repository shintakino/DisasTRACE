export type ReportStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DUPLICATE';

export function canCancelChatbotReport(input: { status: ReportStatus; hasIncident: boolean }) {
  return input.status === 'PENDING' && !input.hasIncident;
}

export function isUnresolvedReportStatus(status: ReportStatus) {
  return status === 'PENDING' || status === 'VERIFIED' || status === 'DUPLICATE';
}
