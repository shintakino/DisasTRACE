import { useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export function useBroadcastTracker(incidentId: string | null, active: boolean) {
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

    // Start location updates on a 5-second fixed interval
    const intervalId = setInterval(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });

        if (loc && loc.coords) {
          let lat = loc.coords.latitude;
          let lng = loc.coords.longitude;

          // Mock coordinates in Baliwag if responder is outside the city (for developer convenience)
          if (lat < 14.90 || lat > 15.00 || lng < 120.80 || lng > 121.00) {
            // Near Baliuag District Hospital by default
            lat = 14.954;
            lng = 120.902;
          }

          const payload = {
            latitude: lat,
            longitude: lng,
            heading: loc.coords.heading || 0,
            speedKph: Math.max(0, Math.round((loc.coords.speed || 0) * 3.6)),
            timestamp: new Date().toISOString()
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

        const loc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });

        if (loc && loc.coords) {
          let lat = loc.coords.latitude;
          let lng = loc.coords.longitude;

          if (lat < 14.90 || lat > 15.00 || lng < 120.80 || lng > 121.00) {
            lat = 14.954;
            lng = 120.902;
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
  }, [incidentId, active]);
}
