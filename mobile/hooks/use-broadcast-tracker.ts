import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';
import { useResponderStore, checkConnectivity } from '../stores/useResponderStore';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('[Background GPS Task] Task error:', error);
      return;
    }
    if (data) {
      const { locations } = data as any;
      if (locations && locations.length > 0) {
        const location = locations[0];
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        
        console.log(`[Background GPS Task] Live background coordinate sync: ${lat}, ${lng}`);
        
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
          const { data: { session } } = await supabase.auth.getSession();
          const reqHeaders: any = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }
          await fetch(`${apiUrl}/api/responder/location`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              latitude: lat,
              longitude: lng
            })
          });
        } catch (err) {
          console.error('[Background GPS Task] Location upload failed:', err);
        }
      }
    }
  });
}

// Helper to calculate distance in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useBroadcastTracker(
  incidentId: string | null,
  active: boolean,
  responderStatus?: string,
  targetHospital?: any,
  activeDispatch?: any
) {
  const lastDbUpdateRef = useRef<number>(0);
  const lastDbLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let channel: any = null;

    if (incidentId && active) {
      // Connect to Supabase Realtime Broadcast Channel
      channel = supabase.channel(`telemetry:${incidentId}`);
      
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to telemetry broadcast for incident ${incidentId}`);
        }
      });

      // Start background location updates
      const startBackgroundLocation = async () => {
        try {
          const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          
          if (fgStatus === 'granted' && bgStatus === 'granted') {
            const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            if (!isStarted) {
              await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 5000,
                distanceInterval: 10,
                foregroundService: {
                  notificationTitle: "DisasTRACE Active Tracking",
                  notificationBody: "DisasTRACE is synchronized with live GPS location telemetry in the background.",
                  notificationColor: "#1E3A8A"
                }
              });
              console.log('[useBroadcastTracker] Started background location updates.');
            }
          } else {
            console.warn('[useBroadcastTracker] Background location permissions not fully granted.');
          }
        } catch (err) {
          console.error('[useBroadcastTracker] Error starting background location updates:', err);
        }
      };

      startBackgroundLocation();
    }

    // Helper to query location with high-accuracy, cache fallback, and safe defaults
    const queryPosition = async (): Promise<{ latitude: number; longitude: number; heading: number; speed: number } | null> => {
      try {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('GPS timeout')), 3500)
          )
        ]);
        if (loc && loc.coords) {
          return {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading || 0,
            speed: loc.coords.speed || 0
          };
        }
      } catch (err) {
        console.warn('[Broadcast GPS] High accuracy request failed/timed out, trying cached position:', err);
        try {
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc && lastLoc.coords) {
            return {
              latitude: lastLoc.coords.latitude,
              longitude: lastLoc.coords.longitude,
              heading: lastLoc.coords.heading || 0,
              speed: lastLoc.coords.speed || 0
            };
          }
        } catch (cacheErr) {
          console.warn('[Broadcast GPS] Cached position failed, using default Baliwag position:', cacheErr);
        }
      }
      // Fail-safe estimated default coordinates with a tiny offset
      return {
        latitude: 14.954 + (Math.random() - 0.5) * 0.002,
        longitude: 120.902 + (Math.random() - 0.5) * 0.002,
        heading: 0,
        speed: 0
      };
    };

    // Start location updates on a 3-second fixed interval
    const intervalId = setInterval(async () => {
      if (!active) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await queryPosition();
        if (pos) {
          let lat = pos.latitude;
          let lng = pos.longitude;

          const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

          // Geofence coordinate locking for developer testing convenience
          if (isDevMode && (lat < 14.90 || lat > 15.05 || lng < 120.80 || lng > 121.00)) {
            if (responderStatus === 'on_scene' && activeDispatch?.coordinates) {
              lat = activeDispatch.coordinates.latitude;
              lng = activeDispatch.coordinates.longitude;
            } else {
              lat = 14.954;
              lng = 120.902;
            }
          } else if (responderStatus === 'on_scene' && activeDispatch?.coordinates) {
            // Maintain on-scene snap alignment in both dev and production to ensure map markers overlap perfectly
            lat = activeDispatch.coordinates.latitude;
            lng = activeDispatch.coordinates.longitude;
          }

          const payload = {
            latitude: lat,
            longitude: lng,
            heading: pos.heading,
            speedKph: Math.max(0, Math.round(pos.speed * 3.6)),
            timestamp: new Date().toISOString(),
            responderStatus,
            targetHospital
          };

          // 1. Emit L2 broadcast event for sub-second smooth map updates
          if (channel) {
            channel.send({
              type: 'broadcast',
              event: 'telemetry',
              payload
            });
          }

          // 2. Perform background REST keep-alive cache updates in postgres (Throttled)
          const now = Date.now();
          const lastUpdate = lastDbUpdateRef.current;
          const lastLoc = lastDbLocationRef.current;
          
          let shouldUpdateDb = false;
          if (!lastLoc || lastUpdate === 0) {
            shouldUpdateDb = true;
          } else {
            const secondsElapsed = (now - lastUpdate) / 1000;
            const distanceMoved = calculateDistanceMeters(
              lastLoc.latitude,
              lastLoc.longitude,
              lat,
              lng
            );
            if (secondsElapsed >= 30 || distanceMoved >= 50) {
              shouldUpdateDb = true;
            }
          }

          if (shouldUpdateDb) {
            lastDbUpdateRef.current = now;
            lastDbLocationRef.current = { latitude: lat, longitude: lng };

            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
            const { data: { session } } = await supabase.auth.getSession();
            const reqHeaders: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
              reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
            }

            const sendTelemetry = async () => {
              let isOnline = false;
              try {
                isOnline = await checkConnectivity();
              } catch (e) {
                isOnline = false;
              }

              if (!isOnline) {
                console.log('[BroadcastTracker] Network offline before telemetry fetch. Enqueuing telemetry sync.');
                await useResponderStore.getState().enqueueAction({
                  type: 'TELEMETRY_SYNC',
                  endpoint: '/api/responder/location',
                  method: 'POST',
                  payload: { latitude: lat, longitude: lng }
                });
                return;
              }

              try {
                const response = await fetch(`${apiUrl}/api/responder/location`, {
                  method: 'POST',
                  headers: reqHeaders,
                  body: JSON.stringify({
                    latitude: lat,
                    longitude: lng
                  })
                });
                if (!response.ok) {
                  throw new Error(`HTTP error ${response.status}`);
                }
              } catch (err) {
                console.log('Location DB cache sync failed, enqueuing offline telemetry:', err);
                await useResponderStore.getState().enqueueAction({
                  type: 'TELEMETRY_SYNC',
                  endpoint: '/api/responder/location',
                  method: 'POST',
                  payload: { latitude: lat, longitude: lng }
                });
              }
            };

            sendTelemetry();
          }
        }
      } catch (error) {
        console.error('Error broadcasting telemetry:', error);
      }
    }, 3000);

    // Call it once immediately for fast initial sync
    const initialSync = async () => {
      if (!active) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await queryPosition();
        if (pos) {
          let lat = pos.latitude;
          let lng = pos.longitude;

          if (lat < 14.90 || lat > 15.05 || lng < 120.80 || lng > 121.00) {
            if (responderStatus === 'on_scene' && activeDispatch?.coordinates) {
              lat = activeDispatch.coordinates.latitude;
              lng = activeDispatch.coordinates.longitude;
            } else {
              lat = 14.954;
              lng = 120.902;
            }
          }

          lastDbUpdateRef.current = Date.now();
          lastDbLocationRef.current = { latitude: lat, longitude: lng };

          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
          const { data: { session } } = await supabase.auth.getSession();
          const reqHeaders: any = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }

          const sendInitialTelemetry = async () => {
            let isOnline = false;
            try {
              isOnline = await checkConnectivity();
            } catch (e) {
              isOnline = false;
            }

            if (!isOnline) {
              console.log('[BroadcastTracker] Network offline during initial sync. Enqueuing telemetry.');
              await useResponderStore.getState().enqueueAction({
                type: 'TELEMETRY_SYNC',
                endpoint: '/api/responder/location',
                method: 'POST',
                payload: { latitude: lat, longitude: lng }
              });
              return;
            }

            try {
              const response = await fetch(`${apiUrl}/api/responder/location`, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({
                  latitude: lat,
                  longitude: lng
                })
              });
              if (!response.ok) {
                throw new Error(`HTTP status ${response.status}`);
              }
            } catch (err) {
              console.log('Location DB initial sync failed, enqueuing offline telemetry:', err);
              await useResponderStore.getState().enqueueAction({
                type: 'TELEMETRY_SYNC',
                endpoint: '/api/responder/location',
                method: 'POST',
                payload: { latitude: lat, longitude: lng }
              });
            }
          };

          sendInitialTelemetry();
        }
      } catch (err) {
        console.log('Error initial sync:', err);
      }
    };
    
    initialSync();

    return () => {
      clearInterval(intervalId);
      if (channel) {
        channel.unsubscribe();
      }

      // Stop background location updates
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        .then((isStarted) => {
          if (isStarted) {
            Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
              .then(() => console.log('[useBroadcastTracker] Stopped background location updates.'))
              .catch((e) => console.error('Error stopping background location:', e));
          }
        })
        .catch((e) => console.log('Error checking background location status:', e));
    };
  }, [incidentId, active, responderStatus, targetHospital, activeDispatch]);
}
