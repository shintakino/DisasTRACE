export const RESPONDER_MAX_TRAVEL_SPEED_METERS_PER_SECOND = 83.34; // 300 km/h
const GPS_JITTER_ALLOWANCE_METERS = 250;
const STALE_LOCATION_WINDOW_MS = 15 * 60 * 1000;

export function distanceBetweenCoordinatesMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = (latitudeB - latitudeA) * Math.PI / 180;
  const longitudeDelta = (longitudeB - longitudeA) * Math.PI / 180;
  const latitudeARadians = latitudeA * Math.PI / 180;
  const latitudeBRadians = latitudeB * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeARadians) * Math.cos(latitudeBRadians) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function assessResponderLocationMovement(input: {
  previousLatitude: number | null;
  previousLongitude: number | null;
  previousUpdatedAt: Date | null;
  latitude: number;
  longitude: number;
  observedAt?: Date;
}) {
  const observedAt = input.observedAt ?? new Date();
  if (
    input.previousLatitude === null
    || input.previousLongitude === null
    || input.previousUpdatedAt === null
  ) {
    return { plausible: true as const, distanceMeters: 0, elapsedSeconds: 0 };
  }

  const elapsedMilliseconds = observedAt.getTime() - input.previousUpdatedAt.getTime();
  if (elapsedMilliseconds <= 0 || elapsedMilliseconds > STALE_LOCATION_WINDOW_MS) {
    return { plausible: true as const, distanceMeters: 0, elapsedSeconds: 0 };
  }

  const elapsedSeconds = elapsedMilliseconds / 1000;
  const distanceMeters = distanceBetweenCoordinatesMeters(
    input.previousLatitude,
    input.previousLongitude,
    input.latitude,
    input.longitude,
  );
  const permittedDistanceMeters = GPS_JITTER_ALLOWANCE_METERS
    + elapsedSeconds * RESPONDER_MAX_TRAVEL_SPEED_METERS_PER_SECOND;

  return {
    plausible: distanceMeters <= permittedDistanceMeters,
    distanceMeters,
    elapsedSeconds,
  } as const;
}
