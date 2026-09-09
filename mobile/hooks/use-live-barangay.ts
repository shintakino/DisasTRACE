import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { resolveBaliwagLocation } from '../lib/baliwag-location';
import { isMockedLocation } from '../lib/location-integrity';

const MINIMUM_REFRESH_DISTANCE_METERS = 50;

type LiveLocation = {
  city: string | null;
  barangay: string | null;
  state: 'loading' | 'ready' | 'permission_required' | 'outside_service_area' | 'unavailable';
};

type Coordinates = { latitude: number; longitude: number };

const INITIAL_LOCATION: LiveLocation = { city: null, barangay: null, state: 'loading' };

function distanceInMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos((first.latitude * Math.PI) / 180)
      * Math.cos((second.latitude * Math.PI) / 180)
      * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useLiveBarangay(enabled: boolean, observedCoordinate?: Coordinates | null) {
  const [location, setLocation] = useState<LiveLocation>(INITIAL_LOCATION);
  const lastResolvedCoordinate = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastResolvedCoordinate.current = null;
      setLocation(INITIAL_LOCATION);
      return;
    }

    let active = true;
    let subscription: Location.LocationSubscription | undefined;

    const resolveBarangay = async (coordinate: { latitude: number; longitude: number }) => {
      if (
        lastResolvedCoordinate.current
        && distanceInMeters(lastResolvedCoordinate.current, coordinate) < MINIMUM_REFRESH_DISTANCE_METERS
      ) return;

      try {
        const resolved = await resolveBaliwagLocation(coordinate.latitude, coordinate.longitude);
        if (!active) return;

        lastResolvedCoordinate.current = coordinate;
        if (resolved) {
          setLocation({ city: resolved.city, barangay: resolved.barangay, state: 'ready' });
        } else {
          setLocation({ city: null, barangay: null, state: 'outside_service_area' });
        }
      } catch (error) {
        console.warn('[LiveBarangay] Unable to resolve current barangay:', error);
        if (active) setLocation({ city: null, barangay: null, state: 'unavailable' });
      }
    };

    const startTracking = async () => {
      if (observedCoordinate) {
        await resolveBarangay(observedCoordinate);
        return;
      }

      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        const permission = await Location.getForegroundPermissionsAsync();
        if (!servicesEnabled || permission.status !== 'granted') {
          if (active) setLocation({ city: null, barangay: null, state: 'permission_required' });
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (isMockedLocation(current)) {
          if (active) setLocation({ city: null, barangay: null, state: 'unavailable' });
          return;
        }
        await resolveBarangay(current.coords);
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30_000,
            distanceInterval: MINIMUM_REFRESH_DISTANCE_METERS,
          },
          (nextLocation) => {
            if (isMockedLocation(nextLocation)) {
              if (active) setLocation({ city: null, barangay: null, state: 'unavailable' });
              return;
            }
            void resolveBarangay(nextLocation.coords);
          },
        );
      } catch (error) {
        console.warn('[LiveBarangay] Unable to read device location:', error);
        if (active) setLocation({ city: null, barangay: null, state: 'unavailable' });
      }
    };

    void startTracking();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [enabled, observedCoordinate?.latitude, observedCoordinate?.longitude]);

  return location;
}
