import {
  INCIDENT_DEDUPLICATION_WINDOW_MS,
  distanceBetweenMeters,
} from '@/lib/incident-deduplication';

export interface ConsolidationCandidate {
  id: string;
  type: string;
  nature: string;
  status: string;
  incidentStatus: string | null;
  parentRequestId: string | null;
  latitude: number;
  longitude: number;
  createdAt: Date | string;
}

export type ReportConsolidation =
  | { kind: 'NONE' }
  | { kind: 'AUTO_LINK_EMERGENCY'; parentRequestId: string }
  | { kind: 'PACC_REVIEW_NON_EMERGENCY'; parentRequestId: string };

export function selectReportConsolidation(
  incoming: Pick<ConsolidationCandidate, 'type' | 'nature' | 'latitude' | 'longitude'>,
  candidates: readonly ConsolidationCandidate[],
  options: { now?: Date; radiusMeters: number },
): ReportConsolidation {
  const now = options.now ?? new Date();
  const activeMatches = candidates
    .filter((candidate) => {
      const createdAt = new Date(candidate.createdAt).getTime();
      return candidate.type === incoming.type
        && candidate.nature === incoming.nature
        && candidate.parentRequestId === null
        && (candidate.status === 'PENDING' || (candidate.status === 'VERIFIED' && candidate.incidentStatus !== 'RESOLVED'))
        && Number.isFinite(createdAt)
        && createdAt >= now.getTime() - INCIDENT_DEDUPLICATION_WINDOW_MS
        && distanceBetweenMeters(incoming.latitude, incoming.longitude, candidate.latitude, candidate.longitude) <= options.radiusMeters;
    })
    .sort((left, right) => {
      const distance = distanceBetweenMeters(incoming.latitude, incoming.longitude, left.latitude, left.longitude)
        - distanceBetweenMeters(incoming.latitude, incoming.longitude, right.latitude, right.longitude);
      if (distance !== 0) return distance;
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
  const parent = activeMatches[0];
  if (!parent) return { kind: 'NONE' };

  if (incoming.nature === 'EMERGENCY') {
    return { kind: 'AUTO_LINK_EMERGENCY', parentRequestId: parent.id };
  }
  if (incoming.type === 'Patient Transport' || incoming.type === 'Other / non-emergency request') {
    return { kind: 'PACC_REVIEW_NON_EMERGENCY', parentRequestId: parent.id };
  }
  return { kind: 'NONE' };
}
