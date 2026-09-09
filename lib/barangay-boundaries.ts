import baliwagBarangays from '@/lib/data/baliwag-barangays.json';

type Point = readonly [number, number];

interface BoundaryFeature {
  geometry: { type: 'Polygon'; coordinates: Point[][] };
  properties: { brgy_name: string; psgc_10d: string };
}

const boundaries = (baliwagBarangays.features as unknown as BoundaryFeature[]).map((feature) => ({
  name: feature.properties.brgy_name,
  psgcCode: feature.properties.psgc_10d,
  rings: feature.geometry.coordinates,
}));

// PSA GeoRisk Barangay Boundary layer, frozen 2026-09-09. The source still
// uses the former municipality name, Baliuag; PSGC codes identify City of
// Baliwag unambiguously.
function ringContainsPoint([longitude, latitude]: Point, ring: Point[]) {
  let contained = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentLongitude, currentLatitude] = ring[current];
    const [previousLongitude, previousLatitude] = ring[previous];
    const intersects = ((currentLatitude > latitude) !== (previousLatitude > latitude)) &&
      longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) /
        (previousLatitude - currentLatitude) + currentLongitude;
    if (intersects) contained = !contained;
  }
  return contained;
}

export function resolveBaliwagBarangay(latitude: number, longitude: number) {
  return boundaries.find((boundary) => ringContainsPoint([longitude, latitude], boundary.rings[0])) ?? null;
}

/**
 * Service-area validation for report intake. A rectangular latitude/longitude
 * envelope is not sufficient because it includes locations outside City of
 * Baliwag; this delegates to the same official boundary lookup that assigns
 * the report's barangay.
 */
export function isWithinOfficialBaliwagBoundary(latitude: number, longitude: number) {
  return resolveBaliwagBarangay(latitude, longitude) !== null;
}

export const BALIWAG_BARANGAYS = boundaries.map(({ name, psgcCode }) => ({ name, psgcCode }));
