import { useState, useEffect } from 'react';

interface Coords {
  latitude: number;
  longitude: number;
}

export function useOSRMRoute(start: Coords | null, end: Coords | null) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start || !end) {
      setRouteCoordinates([]);
      setDurationMinutes(0);
      setDistanceKm(0);
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `http://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch OSRM route');
        }
        
        const data = await response.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteCoordinates(route.geometry.coordinates); // Array of [lng, lat]
          setDurationMinutes(Math.max(1, Math.round(route.duration / 60)));
          setDistanceKm(Number((route.distance / 1000).toFixed(1)));
        } else {
          throw new Error('OSRM returned empty routing results');
        }
      } catch (err: any) {
        console.error('Error fetching OSRM directions:', err);
        setError(err.message || 'Routing failure');
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [start?.latitude, start?.longitude, end?.latitude, end?.longitude]);

  return { routeCoordinates, durationMinutes, distanceKm, loading, error };
}
