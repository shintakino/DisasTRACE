/** Android marks LocationObject.mocked when a location came from a mock provider. */
export function isMockedLocation(location: { mocked?: boolean } | null | undefined) {
  return location?.mocked === true;
}

export const MOCK_LOCATION_MESSAGE = 'Mock location detected. Turn off any fake GPS or Developer Options mock-location app, then capture your real GPS location again.';

export const MAX_OPERATIONAL_CACHED_LOCATION_AGE_MS = 60_000;

/**
 * A cached coordinate may make a map feel responsive, but it must not be
 * presented to dispatch as a current device location after it has gone stale.
 */
export function isFreshOperationalLocation(
  location: { timestamp?: number } | null | undefined,
  maximumAgeMs = MAX_OPERATIONAL_CACHED_LOCATION_AGE_MS,
  now = Date.now(),
) {
  return Boolean(
    location
      && typeof location.timestamp === 'number'
      && Number.isFinite(location.timestamp)
      && location.timestamp <= now
      && now - location.timestamp <= maximumAgeMs,
  );
}
