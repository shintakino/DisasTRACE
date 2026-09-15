import { distanceBetweenCoordinatesMeters } from '@/lib/location-integrity';

export const ARRIVAL_RADIUS_METERS = 75;
export const ARRIVAL_MAX_ACCURACY_METERS = 50;
export const ARRIVAL_SAMPLE_MAX_AGE_MS = 30_000;

interface ArrivalSample {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  observedAt: Date | null;
}

export function shouldAutomaticallyMarkArrived(input: {
  incidentLatitude: number;
  incidentLongitude: number;
  incidentCreatedAt: Date;
  previous: ArrivalSample;
  current: ArrivalSample;
}) {
  const { previous, current } = input;
  if (
    previous.latitude === null || previous.longitude === null || previous.accuracy === null || !previous.observedAt
    || current.latitude === null || current.longitude === null || current.accuracy === null || !current.observedAt
  ) return false;
  if (previous.accuracy > ARRIVAL_MAX_ACCURACY_METERS || current.accuracy > ARRIVAL_MAX_ACCURACY_METERS) return false;
  if (previous.observedAt < input.incidentCreatedAt) return false;
  const elapsed = current.observedAt.getTime() - previous.observedAt.getTime();
  if (elapsed < 0 || elapsed > ARRIVAL_SAMPLE_MAX_AGE_MS) return false;

  const previousDistance = distanceBetweenCoordinatesMeters(
    input.incidentLatitude,
    input.incidentLongitude,
    previous.latitude,
    previous.longitude,
  );
  const currentDistance = distanceBetweenCoordinatesMeters(
    input.incidentLatitude,
    input.incidentLongitude,
    current.latitude,
    current.longitude,
  );
  return previousDistance <= ARRIVAL_RADIUS_METERS && currentDistance <= ARRIVAL_RADIUS_METERS;
}
