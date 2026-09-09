export const INCIDENT_DEDUPLICATION_WINDOW_MS = 20 * 60 * 1000;

function getConfiguredRadiusMeters() {
  const configured = Number(process.env.INCIDENT_DEDUPLICATION_RADIUS_METERS);
  // A tight enough default to prevent duplicate dispatches without collapsing
  // separate emergencies in neighbouring streets. Deployments may tune it
  // between 50 m and 1 km without changing client code.
  return Number.isFinite(configured) && configured >= 50 && configured <= 1_000
    ? configured
    : 250;
}

export const INCIDENT_DEDUPLICATION_RADIUS_METERS = getConfiguredRadiusMeters();

export function distanceBetweenMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isLikelyDuplicateIncident(
  candidate: { type: string; latitude: number; longitude: number },
  existing: { type: string; latitude: number; longitude: number },
  radiusMeters = INCIDENT_DEDUPLICATION_RADIUS_METERS,
) {
  return candidate.type === existing.type &&
    distanceBetweenMeters(candidate.latitude, candidate.longitude, existing.latitude, existing.longitude) <= radiusMeters;
}
