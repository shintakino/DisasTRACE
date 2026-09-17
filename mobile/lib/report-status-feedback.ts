export interface ReportRefreshState {
  lastCheckedAt: Date | null;
  error: string | null;
}

export function reportRefreshCopy(state: ReportRefreshState) {
  if (state.error) {
    return {
      tone: 'warning' as const,
      text: 'Unable to confirm the latest status. Showing the last confirmed update. Retry now or contact PACC if the situation is urgent.',
    };
  }
  if (!state.lastCheckedAt) return { tone: 'neutral' as const, text: 'Checking for the latest confirmed status…' };
  return {
    tone: 'confirmed' as const,
    text: `Last checked ${state.lastCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  };
}
