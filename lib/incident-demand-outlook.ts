export type DemandDirection = 'rising' | 'stable' | 'falling';

export interface IncidentDemandOutlookInput {
  completedBuckets: number[];
  verifiedIncidents: number;
  leadingType: string | null;
  leadingBarangay: string | null;
}

export interface IncidentDemandOutlook {
  available: boolean;
  reason: 'READY' | 'INSUFFICIENT_HISTORY';
  projectedCount: number | null;
  observedRange: { min: number; max: number } | null;
  direction: DemandDirection | null;
  sampleSize: number;
  leadingType: string | null;
  leadingBarangay: string | null;
  disclaimer: string;
}

export function completedBucketLabels(period: 'day' | 'week' | 'month', now = new Date(), count = 8): string[] {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const localTodayAtNoonUtc = new Date(Date.UTC(value('year'), value('month') - 1, value('day'), 4));
  const labels: string[] = [];

  if (period === 'day') {
    for (let offset = count; offset >= 1; offset -= 1) {
      const date = new Date(localTodayAtNoonUtc.getTime() - offset * 86_400_000);
      labels.push(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: '2-digit' }).format(date));
    }
    return labels;
  }

  if (period === 'week') {
    const dayOfWeek = localTodayAtNoonUtc.getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const currentMonday = new Date(localTodayAtNoonUtc.getTime() - daysSinceMonday * 86_400_000);
    for (let offset = count; offset >= 1; offset -= 1) {
      const date = new Date(currentMonday.getTime() - offset * 7 * 86_400_000);
      const label = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: '2-digit' }).format(date);
      labels.push(`Week of ${label}`);
    }
    return labels;
  }

  for (let offset = count; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(value('year'), value('month') - 1 - offset, 1, 4));
    labels.push(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', year: 'numeric' }).format(date));
  }
  return labels;
}

export function zeroFillCompletedBuckets(
  period: 'day' | 'week' | 'month',
  rows: Array<{ label: string; count: number }>,
  now = new Date(),
) {
  const counts = new Map(rows.map((row) => [row.label, Number(row.count)]));
  return completedBucketLabels(period, now).map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

const DISCLAIMER = 'Planning estimate based on recorded verified incidents; not a real-time hazard warning.';

export function buildIncidentDemandOutlook(input: IncidentDemandOutlookInput): IncidentDemandOutlook {
  const completedBuckets = input.completedBuckets
    .filter((count) => Number.isFinite(count) && count >= 0)
    .map((count) => Math.round(count));

  if (completedBuckets.length < 4 || input.verifiedIncidents < 5) {
    return {
      available: false,
      reason: 'INSUFFICIENT_HISTORY',
      projectedCount: null,
      observedRange: null,
      direction: null,
      sampleSize: input.verifiedIncidents,
      leadingType: input.leadingType,
      leadingBarangay: input.leadingBarangay,
      disclaimer: DISCLAIMER,
    };
  }

  const recent = completedBuckets.slice(-4);
  const weightedTotal = recent.reduce((sum, count, index) => sum + count * (index + 1), 0);
  const projectedCount = Math.round(weightedTotal / 10);
  const previous = completedBuckets.slice(-8, -4);
  const recentAverage = recent.reduce((sum, count) => sum + count, 0) / recent.length;
  const previousAverage = previous.length
    ? previous.reduce((sum, count) => sum + count, 0) / previous.length
    : recentAverage;
  const materialChange = Math.max(1, previousAverage * 0.1);
  const direction: DemandDirection = recentAverage > previousAverage + materialChange
    ? 'rising'
    : recentAverage < previousAverage - materialChange
      ? 'falling'
      : 'stable';

  return {
    available: true,
    reason: 'READY',
    projectedCount,
    observedRange: { min: Math.min(...recent), max: Math.max(...recent) },
    direction,
    sampleSize: input.verifiedIncidents,
    leadingType: input.leadingType,
    leadingBarangay: input.leadingBarangay,
    disclaimer: DISCLAIMER,
  };
}
