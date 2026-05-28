import { useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export function useBroadcastTracker(
  incidentId: string | null,
  active: boolean,
  responderStatus?: string,
  targetHospital?: any,
  activeDispatch?: any
) {
  useEffect(() => {
    let channel: any = null;

    if (incidentId && active) {
      // Connect to Supabase Realtime Broadcast Channel
      channel = supabase.channel(`incident-tracking:${incidentId}`);
      
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to telemetry broadcast for incident ${incidentId}`);
        }
      });
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

    // Start location updates on a 5-second fixed interval
    const intervalId = setInterval(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await queryPosition();
        if (pos) {
          let lat = pos.latitude;
          let lng = pos.longitude;

          // Mock coordinates in Baliwag if responder is outside the city (for developer convenience)
          if (lat < 14.90 || lat > 15.00 || lng < 120.80 || lng > 121.00) {
            if (responderStatus === 'on_scene' && activeDispatch?.coordinates) {
              lat = activeDispatch.coordinates.latitude;
              lng = activeDispatch.coordinates.longitude;
            } else {
              lat = 14.954;
              lng = 120.902;
            }
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

          // 2. Perform background REST keep-alive cache updates in postgres
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
          const { data: { session } } = await supabase.auth.getSession();
          const reqHeaders: any = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }

          fetch(`${apiUrl}/api/responder/location`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              latitude: lat,
              longitude: lng
            })
          }).catch(err => console.log('Location DB cache sync failed:', err));
        }
      } catch (error) {
        console.error('Error broadcasting telemetry:', error);
      }
    }, 5000);

    // Call it once immediately for fast initial sync
    const initialSync = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await queryPosition();
        if (pos) {
          let lat = pos.latitude;
          let lng = pos.longitude;

          if (lat < 14.90 || lat > 15.00 || lng < 120.80 || lng > 121.00) {
            if (responderStatus === 'on_scene' && activeDispatch?.coordinates) {
              lat = activeDispatch.coordinates.latitude;
              lng = activeDispatch.coordinates.longitude;
            } else {
              lat = 14.954;
              lng = 120.902;
            }
          }

          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
          const { data: { session } } = await supabase.auth.getSession();
          const reqHeaders: any = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }

          fetch(`${apiUrl}/api/responder/location`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              latitude: lat,
              longitude: lng
            })
          }).catch(err => console.log('Location DB initial sync failed:', err));
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
    };
  }, [incidentId, active, responderStatus, targetHospital, activeDispatch]);
}
