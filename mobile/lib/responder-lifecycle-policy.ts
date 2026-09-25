import type { DispatchState } from '../stores/useResponderStore';
import { isValidGeoPoint, type GeoPoint } from './hospital-destination-policy';

export type ResponderIncidentStatus =
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'DOCUMENTATION_PENDING'
  | 'RESOLVED';

export type ResponderTransportStatus = 'NONE' | 'TO_HOSPITAL' | 'ARRIVED_AT_HOSPITAL';

const MIN_ROUTE_DISTANCE_METERS = 15;

function distanceMeters(origin: GeoPoint, destination: GeoPoint) {
  const earthRadiusMeters = 6_371_000;
  const originLatitude = origin.latitude * Math.PI / 180;
  const destinationLatitude = destination.latitude * Math.PI / 180;
  const latitudeDelta = (destination.latitude - origin.latitude) * Math.PI / 180;
  const longitudeDelta = (destination.longitude - origin.longitude) * Math.PI / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getRestoredResponderState(
  incidentStatus: string | null | undefined,
  transportStatus: string | null | undefined,
): DispatchState | null {
  if (incidentStatus === 'DOCUMENTATION_PENDING' || incidentStatus === 'RESOLVED') return null;
  if (incidentStatus === 'ARRIVED') {
    if (transportStatus === 'ARRIVED_AT_HOSPITAL') return 'at_hospital';
    if (transportStatus === 'TO_HOSPITAL') return 'to_hospital';
    return 'on_scene';
  }
  if (incidentStatus === 'EN_ROUTE' || incidentStatus === 'DISPATCHED') return 'en_route';
  return null;
}

export function getResponderStatusLabel(status: DispatchState) {
  const labels: Record<DispatchState, string> = {
    idle: 'Available',
    dispatch_offered: 'Incoming',
    en_route: 'Dispatched',
    on_scene: 'On Scene',
    to_hospital: 'To Hospital',
    at_hospital: 'At Hospital',
    report_filling: 'Documentation',
  };

  return labels[status];
}

export function shouldRequestResponderRoute(input: {
  status: DispatchState;
  hasLiveLocation: boolean;
  origin: GeoPoint | null | undefined;
  destination: GeoPoint | null | undefined;
}) {
  if (!input.hasLiveLocation || !['en_route', 'to_hospital'].includes(input.status)) return false;
  if (!isValidGeoPoint(input.origin) || !isValidGeoPoint(input.destination)) return false;
  return distanceMeters(input.origin, input.destination) > MIN_ROUTE_DISTANCE_METERS;
}
