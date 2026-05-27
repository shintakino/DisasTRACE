import { useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export function useBroadcastTracker(incidentId: string | null, active: boolean) {
  useEffect(() => {
    if (!incidentId || !active) return;

    // Connect to Supabase Realtime Broadcast Channel
    const channel = supabase.channel(`incident-tracking:${incidentId}`);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to telemetry broadcast for incident ${incidentId}`);
      }
    });

    // Start location updates on a 5-second fixed interval
    const intervalId = setInterval(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.Balanced 
        });

        if (loc && loc.coords) {
          const payload = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading || 0,
            speedKph: Math.max(0, Math.round((loc.coords.speed || 0) * 3.6)),
            timestamp: new Date().toISOString()
          };

          // 1. Emit L2 broadcast event for sub-second smooth map updates
          channel.send({
            type: 'broadcast',
            event: 'telemetry',
            payload
          });

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
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            })
          }).catch(err => console.log('Location DB cache sync failed:', err));
        }
      } catch (error) {
        console.error('Error broadcasting telemetry:', error);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      channel.unsubscribe();
    };
  }, [incidentId, active]);
}
