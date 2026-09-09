/** Android marks LocationObject.mocked when a location came from a mock provider. */
export function isMockedLocation(location: { mocked?: boolean } | null | undefined) {
  return location?.mocked === true;
}

export const MOCK_LOCATION_MESSAGE = 'Mock location detected. Turn off any fake GPS or Developer Options mock-location app, then capture your real GPS location again.';
