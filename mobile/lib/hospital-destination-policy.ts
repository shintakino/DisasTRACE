export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface HospitalDestinationCandidate {
  id: string;
  name: string;
  caters: boolean;
  coordinates: GeoPoint;
}

export type RankedHospital<T extends HospitalDestinationCandidate> = T & {
  distanceMeters: number;
  distanceKm: number;
};

export function isValidGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return Boolean(
    point
      && Number.isFinite(point.latitude)
      && Number.isFinite(point.longitude)
      && point.latitude >= -90
      && point.latitude <= 90
      && point.longitude >= -180
      && point.longitude <= 180,
  );
}

export function isEligibleHospitalDestination(
  hospital: HospitalDestinationCandidate | null | undefined,
): hospital is HospitalDestinationCandidate {
  return Boolean(
    hospital
      && hospital.id.trim().length > 0
      && hospital.caters === true
      && isValidGeoPoint(hospital.coordinates),
  );
}

export function distanceBetweenPointsMeters(origin: GeoPoint, destination: GeoPoint): number {
  const earthRadiusMeters = 6_371_000;
  const phi1 = origin.latitude * Math.PI / 180;
  const phi2 = destination.latitude * Math.PI / 180;
  const deltaPhi = (destination.latitude - origin.latitude) * Math.PI / 180;
  const deltaLambda = (destination.longitude - origin.longitude) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function rankEligibleHospitals<T extends HospitalDestinationCandidate>(
  candidates: readonly T[],
  origin: GeoPoint,
): RankedHospital<T>[] {
  if (!isValidGeoPoint(origin)) return [];

  return candidates
    .filter(isEligibleHospitalDestination)
    .map((hospital) => {
      const distanceMeters = distanceBetweenPointsMeters(origin, hospital.coordinates);
      return {
        ...hospital,
        distanceMeters,
        distanceKm: Number((distanceMeters / 1000).toFixed(1)),
      };
    })
    .sort((left, right) => (
      left.distanceMeters - right.distanceMeters
      || left.id.localeCompare(right.id)
    ));
}

export function getNearestEligibleHospital<T extends HospitalDestinationCandidate>(
  candidates: readonly T[],
  origin: GeoPoint,
): RankedHospital<T> | null {
  return rankEligibleHospitals(candidates, origin)[0] ?? null;
}

export function getAutomaticHospitalRecommendation<T extends HospitalDestinationCandidate>(input: {
  status: string;
  currentTarget: HospitalDestinationCandidate | null | undefined;
  candidates: readonly T[];
  origin: GeoPoint | null | undefined;
}): RankedHospital<T> | null {
  if (input.status !== 'to_hospital' || input.currentTarget || !isValidGeoPoint(input.origin)) {
    return null;
  }

  return getNearestEligibleHospital(input.candidates, input.origin);
}

export function canEnterHospitalReport(
  status: string,
  targetHospital: HospitalDestinationCandidate | null | undefined,
): boolean {
  if (status === 'at_hospital') return isEligibleHospitalDestination(targetHospital);
  return status === 'on_scene' || status === 'report_filling';
}

export function canStartHospitalTransport(status: string): boolean {
  return status === 'on_scene';
}
