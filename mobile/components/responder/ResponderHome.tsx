import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { MapPin, HelpCircle, Bell, ChevronRight, Check, Truck, Compass, Eye, Play, Pause, LogOut } from 'lucide-react-native';
import { Hospital } from 'iconsax-react-native';
import { useResponderStore, checkConnectivity } from '../../stores/useResponderStore';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { DispatchSheet } from './DispatchSheet';
import { EnRouteSheet } from './EnRouteSheet';
import { OnSceneSheet } from './OnSceneSheet';
import { ArrivalConfirmDialog } from './ArrivalConfirmDialog';
import { ToHospitalSheet } from './ToHospitalSheet';
import { IncidentReportForm } from './IncidentReportForm';
import { LinearGradient } from 'expo-linear-gradient';
import { FolderDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import { useBroadcastTracker } from '../../hooks/use-broadcast-tracker';
import { OfflineBanner } from '../dashboard/OfflineBanner';
import * as Notifications from 'expo-notifications';

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

export function ResponderHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, activeDispatch, targetHospital, setTargetHospital } = useResponderStore();
  const { profile, user, role } = useAuthStatus();
  const [unreadCount, setUnreadCount] = useState(0);

  // Configure notifications permissions and foreground notification behavior
  useEffect(() => {
    async function configureNotifications() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission to send local alerts was not granted.');
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldVibrate: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldSetBadge: false,
        } as any),
      });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('emergency-alerts', {
          name: 'Emergency Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250, 250, 250],
          lightColor: '#EF4444',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }
    }

    configureNotifications();
  }, []);

  // Fetch and subscribe to unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('unread', true);
        
        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('[ResponderHome] Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();

    const instanceId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`responder_home_notifs_${user.id}_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  // Mock initials
  const initials = profile?.fullName ? profile.fullName.trim().split(/\s+/).map(n => n ? n[0] : '').join('').slice(0, 2).toUpperCase() : 'RB';
  const name = profile?.fullName || 'Renzy Bastes';
  const vehicleInitials = name.trim().split(/\s+/).map(n => n ? n[0] : '').join('').toUpperCase().slice(0, 3);
  const suffix = user?.id ? user.id.slice(-3).toUpperCase() : "";
  const myVehicleId = `AMB-${vehicleInitials || '001'}${suffix ? `-${suffix}` : ""}`;

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([120.895, 14.945]);
  const [heading, setHeading] = useState<number>(0);
  const [isSearchingHospital, setIsSearchingHospital] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [routeBounds, setRouteBounds] = useState<any>(null);
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  const [isCameraCentered, setIsCameraCentered] = useState(true);
  const isMarkerPress = useRef(false);
  const lastDbUpdateRef = useRef<number>(0);
  const lastDbLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);


  // Simulated Drive Telemetry properties
  const [isSimulating, setIsSimulating] = useState(false);
  const isSimulatingRef = useRef(false);
  const simIntervalRef = useRef<any>(null);
  const simIndexRef = useRef<number>(0);
  const simChannelRef = useRef<any>(null);

  const startSimulation = (coords: [number, number][]) => {
    if (coords.length < 2) return;
    setIsSimulating(true);
    isSimulatingRef.current = true;
    simIndexRef.current = 0;
    
    // Complete the path in approximately 15 steps (~45 seconds)
    const stepSize = Math.max(1, Math.floor(coords.length / 15));
    
    // Connect to the resident telemetry channel
    if (activeDispatch?.id) {
      const channel = supabase.channel(`telemetry:${activeDispatch.id}`);
      channel.subscribe();
      simChannelRef.current = channel;
    }

    simIntervalRef.current = setInterval(async () => {
      let nextIdx = simIndexRef.current + stepSize;
      if (nextIdx >= coords.length - 1) {
        nextIdx = coords.length - 1;
        clearInterval(simIntervalRef.current);
        setIsSimulating(false);
        isSimulatingRef.current = false;
        
        // Auto Arrive at scene when en route simulation completes!
        if (status === 'en_route') {
          console.log('[Simulation] Simulation reached incident location. Auto arriving...');
          useResponderStore.getState().arriveAtScene();
        } else if (status === 'to_hospital') {
          console.log('[Simulation] Simulation reached hospital. Auto arriving...');
          useResponderStore.getState().startReport();
        }
      }

      const prevCoord = coords[simIndexRef.current];
      const currentCoord = coords[nextIdx];
      simIndexRef.current = nextIdx;

      // Calculate bearing angle from previous step to current step
      const dy = currentCoord[1] - prevCoord[1];
      const dx = Math.cos((prevCoord[1] * Math.PI) / 180) * (currentCoord[0] - prevCoord[0]);
      let angle = Math.atan2(dx, dy) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      // Update state coordinates and heading
      setCurrentLocation(currentCoord);
      setHeading(angle);

      // Update current speed in store during simulation
      useResponderStore.setState({ currentSpeedKph: 50 });

      // 1. Broadcast telemetry to the resident
      if (simChannelRef.current) {
        try {
          simChannelRef.current.send({
            type: 'broadcast',
            event: 'telemetry',
            payload: {
              latitude: currentCoord[1],
              longitude: currentCoord[0],
              heading: angle,
              speedKph: 50,
              timestamp: new Date().toISOString(),
              responderStatus: status,
              targetHospital: targetHospital
            }
          });
        } catch (err) {
          console.error('[Simulation] Failed to send telemetry broadcast:', err);
        }
      }

      // 2. Sync to central DB cache (Throttled)
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
          currentCoord[1],
          currentCoord[0]
        );
        if (secondsElapsed >= 30 || distanceMoved >= 50) {
          shouldUpdateDb = true;
        }
      }

      if (shouldUpdateDb) {
        lastDbUpdateRef.current = now;
        lastDbLocationRef.current = { latitude: currentCoord[1], longitude: currentCoord[0] };

        const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
        const { data: { session } } = await supabase.auth.getSession();
        const reqHeaders: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }

        const sendSimTelemetry = async () => {
          let isOnline = false;
          try {
            isOnline = await checkConnectivity();
          } catch (e) {
            isOnline = false;
          }

          if (!isOnline) {
            console.log('[Simulation] Network offline before telemetry fetch. Enqueuing telemetry sync.');
            await useResponderStore.getState().enqueueAction({
              type: 'TELEMETRY_SYNC',
              endpoint: '/api/responder/location',
              method: 'POST',
              payload: { latitude: currentCoord[1], longitude: currentCoord[0] }
            });
            return;
          }

          try {
            const response = await fetch(`${apiUrl}/responder/location`, {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                latitude: currentCoord[1],
                longitude: currentCoord[0]
              })
            });
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
            }
          } catch (err) {
            console.log('[Simulation] Telemetry DB sync failed, enqueuing offline telemetry:', err);
            await useResponderStore.getState().enqueueAction({
              type: 'TELEMETRY_SYNC',
              endpoint: '/api/responder/location',
              method: 'POST',
              payload: { latitude: currentCoord[1], longitude: currentCoord[0] }
            });
          }
        };

        sendSimTelemetry();
      }

    }, 3000);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }
    if (simChannelRef.current) {
      supabase.removeChannel(simChannelRef.current);
      simChannelRef.current = null;
    }
    setIsSimulating(false);
    isSimulatingRef.current = false;
  };

  const toggleSimulation = () => {
    if (isSimulating) {
      stopSimulation();
    } else if (routeCoords && routeCoords.length >= 2) {
      startSimulation(routeCoords);
    }
  };

  // Clean up simulation on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
      }
      if (simChannelRef.current) {
        supabase.removeChannel(simChannelRef.current);
      }
    };
  }, []);

  // Auto-stop simulation if status changes to non-driving states
  useEffect(() => {
    if (status !== 'en_route' && status !== 'to_hospital') {
      stopSimulation();
    }
  }, [status]);

  // Active Dispatch Elapsed Time Incrementer (dynamic run timer)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'en_route' || status === 'on_scene' || status === 'to_hospital') {
      interval = setInterval(() => {
        useResponderStore.getState().incrementElapsedTime();
        if (status === 'on_scene') {
          useResponderStore.getState().incrementSceneTime();
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  // Active incident restoration is handled at the parent tab index.tsx gate to prevent screen flashing.

  // Real-time incident dispatch listener
  useEffect(() => {
    if (!profile || role !== 'ambulance_responder' || status !== 'idle' || !user?.id) return;

    console.log('[ResponderHome] Setting up real-time dispatch listener for responder ID:', user.id);

    const channel = supabase
      .channel('incoming-dispatches')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'incidents',
        },
        async (payload) => {
          console.log('[ResponderHome] Postgres change received on incidents table:', payload);
          const inc = payload.new as any;
          if (inc && inc.current_offer_responder_id === user.id && inc.status === 'DISPATCHED') {
            console.log('[ResponderHome] Active dispatch offer received for this responder!', inc);
            
            let reporterName = 'Resident';
            let reporterInitials = 'R';
            let locationName = 'Baliwag City';
            let typeOfEmergency = 'Medical Emergency';
            let peopleInvolved = 1;
            let incidentLat = 14.9538;
            let incidentLng = 120.9029;
            let attachmentUrl: string | undefined = undefined;

            try {
              const { data: vReq, error: vReqError } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('id', inc.request_id)
                .single();

              if (!vReqError && vReq) {
                locationName = vReq.location_description || vReq.address || 'Baliwag City';
                typeOfEmergency = vReq.type || 'Emergency';
                incidentLat = vReq.latitude ? Number(vReq.latitude) : 14.9538;
                incidentLng = vReq.longitude ? Number(vReq.longitude) : 120.9029;
                attachmentUrl = vReq.image_url || undefined;
                
                if (vReq.people_involved) {
                  const matched = vReq.people_involved.match(/\d+/);
                  peopleInvolved = matched ? parseInt(matched[0], 10) : 1;
                }

                const { data: resUser } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', vReq.resident_id)
                  .single();

                if (resUser) {
                  reporterName = resUser.full_name || 'Resident';
                  reporterInitials = reporterName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
                }
              }
            } catch (err) {
              console.error('Error fetching verification request details for dispatch offer:', err);
            }

            useResponderStore.setState({
              status: 'dispatch_offered',
              activeDispatch: {
                id: inc.id,
                type: typeOfEmergency,
                locationName,
                distance: '1.5 km',
                natureOfCall: 'Emergency',
                peopleInvolved,
                eta: '~8 min',
                reporterName,
                reporterInitials,
                timestamp: new Date(inc.created_at).toLocaleTimeString("en-US", {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                coordinates: {
                  latitude: incidentLat,
                  longitude: incidentLng,
                },
                typeOfEmergency,
                dispatchOfferDurationSeconds: inc.dispatch_offer_duration_seconds || 30,
                assignedAmbulance: inc.assigned_ambulance || myVehicleId,
                attachmentUrl,
              }
            });

            // Trigger emergency local notification alert immediately
            Notifications.scheduleNotificationAsync({
              content: {
                title: '🚨 EMERGENCY DISPATCH OFFER',
                body: `New emergency request: ${typeOfEmergency} at ${locationName}. You have 30s to accept.`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                android: {
                  channelId: 'emergency-alerts',
                },
              } as any,
              trigger: null,
            });
          } else if (inc && inc.responder_id === user.id && inc.status === 'EN_ROUTE') {
            console.log('[ResponderHome] Responder has been manually dispatched! Auto-accepting and transitioning directly to EN_ROUTE.');
            
            let reporterName = 'Resident';
            let reporterInitials = 'R';
            let locationName = 'Baliwag City';
            let typeOfEmergency = 'Medical Emergency';
            let peopleInvolved = 1;
            let incidentLat = 14.9538;
            let incidentLng = 120.9029;
            let attachmentUrl: string | undefined = undefined;

            try {
              const { data: vReq, error: vReqError } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('id', inc.request_id)
                .single();

              if (!vReqError && vReq) {
                locationName = vReq.location_description || vReq.address || 'Baliwag City';
                typeOfEmergency = vReq.type || 'Emergency';
                incidentLat = vReq.latitude ? Number(vReq.latitude) : 14.9538;
                incidentLng = vReq.longitude ? Number(vReq.longitude) : 120.9029;
                attachmentUrl = vReq.image_url || undefined;
                
                if (vReq.people_involved) {
                   const matched = vReq.people_involved.match(/\d+/);
                   peopleInvolved = matched ? parseInt(matched[0], 10) : 1;
                }

                const { data: resUser } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', vReq.resident_id)
                  .single();

                if (resUser) {
                  reporterName = resUser.full_name || 'Resident';
                  reporterInitials = reporterName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
                }
              }
            } catch (err) {
              console.error('Error fetching verification request details for manual dispatch:', err);
            }

            useResponderStore.setState({
              status: 'en_route',
              activeDispatch: {
                id: inc.id,
                type: typeOfEmergency,
                locationName,
                distance: '1.5 km',
                natureOfCall: 'Emergency',
                peopleInvolved,
                eta: inc.eta_minutes ? `~${inc.eta_minutes} min` : '~8 min',
                reporterName,
                reporterInitials,
                timestamp: new Date(inc.created_at).toLocaleTimeString("en-US", {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                coordinates: {
                  latitude: incidentLat,
                  longitude: incidentLng,
                },
                typeOfEmergency,
                assignedAmbulance: inc.assigned_ambulance || myVehicleId,
                attachmentUrl,
              }
            });

            // Trigger emergency local notification alert immediately
            Notifications.scheduleNotificationAsync({
              content: {
                title: '🚨 DIRECT EMERGENCY DISPATCH',
                body: `You have been dispatched to: ${typeOfEmergency} at ${locationName}. Proceed immediately!`,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
                android: {
                  channelId: 'emergency-alerts',
                },
              } as any,
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, role, status, user?.id]);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const reqHeaders: any = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
        }
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.4:3000';
        const res = await fetch(`${baseUrl}/api/map/hospitals`, {
          headers: reqHeaders
        });
        if (!res.ok) throw new Error("Failed to fetch hospitals");
        const data = await res.json();
        
        // Map to coordinates format expected by Responder client
        const mapped = data.map((h: any) => ({
          id: h.id,
          name: h.name,
          address: h.address,
          coordinates: { latitude: h.lat, longitude: h.lng },
          caters: h.caters !== false,
          phone: h.phone || ''
        }));
        
        setHospitals(mapped);
      } catch (err) {
        console.error("Error fetching mobile map hospitals:", err);
      }
    };
    
    if (status === 'en_route' || status === 'on_scene' || status === 'to_hospital') {
      fetchHospitals();
    }
  }, [status]);


  // 1. Activate live GPS telemetry tracking
  useBroadcastTracker(
    activeDispatch?.id || null,
    (status === 'en_route' || status === 'on_scene' || status === 'to_hospital') && !isSimulating,
    status,
    targetHospital,
    activeDispatch
  );

  // 2. Track current location of the responder via GPS
  useEffect(() => {
    let subscription: any;
    
    const startTracking = async () => {
      try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
          console.warn('[ResponderHome] Location permission not granted.');
          return;
        }
        
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (loc) => {
            if (isSimulatingRef.current) return;
            let lat = loc.coords.latitude;
            let lng = loc.coords.longitude;
            
            const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

            // Geofence coordinate locking for developer testing convenience
            if (isDevMode && (lat < 14.90 || lat > 15.05 || lng < 120.80 || lng > 121.00)) {
              if (status === 'on_scene' && activeDispatch?.coordinates) {
                lat = activeDispatch.coordinates.latitude;
                lng = activeDispatch.coordinates.longitude;
              } else {
                lat = 14.954;
                lng = 120.902;
              }
            } else if (status === 'on_scene' && activeDispatch?.coordinates) {
              // Maintain on-scene snap alignment in both dev and production to ensure map markers overlap perfectly
              lat = activeDispatch.coordinates.latitude;
              lng = activeDispatch.coordinates.longitude;
            }
            
            setCurrentLocation([lng, lat]);
            if (loc.coords.heading !== null && loc.coords.heading !== undefined) {
              setHeading(loc.coords.heading);
            }

            // Update physical speed in store
            let speedKph = 0;
            if (loc.coords.speed !== null && loc.coords.speed !== undefined && loc.coords.speed > 0) {
              speedKph = Math.round(loc.coords.speed * 3.6);
            }
            useResponderStore.setState({ currentSpeedKph: speedKph });
          }
        );
      } catch (err) {
        console.error('[ResponderHome] Error tracking position:', err);
      }
    };
    
    if (status === 'en_route' || status === 'on_scene' || status === 'to_hospital') {
      startTracking();
    } else {
      // Idle or offered: stay at default Baliwag base
      setCurrentLocation([120.895, 14.945]);
      setHeading(0);
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [status]);

  // 3. Dynamic Real-Time OSRM route calculation
  useEffect(() => {
    if (status === 'en_route' && activeDispatch) {
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[0]},${currentLocation[1]};${activeDispatch.coordinates.longitude},${activeDispatch.coordinates.latitude}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates;
            setRouteCoords(coords);
            
            // Calculate map view bounds for OSRM route
            let minLng = coords[0][0], maxLng = coords[0][0], minLat = coords[0][1], maxLat = coords[0][1];
            coords.forEach((coord: number[]) => {
              if (coord[0] < minLng) minLng = coord[0];
              if (coord[0] > maxLng) maxLng = coord[0];
              if (coord[1] < minLat) minLat = coord[1];
              if (coord[1] > maxLat) maxLat = coord[1];
            });
            setRouteBounds([minLng, minLat, maxLng, maxLat]);
          }
        } catch (err) {
          console.error('[ResponderHome] Error fetching en route route:', err);
        }
      };
      fetchRoute();
    } else if (status === 'to_hospital' && targetHospital) {
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation[0]},${currentLocation[1]};${targetHospital.coordinates.longitude},${targetHospital.coordinates.latitude}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates;
            setRouteCoords(coords);
            
            const distanceKm = Number((data.routes[0].distance / 1000).toFixed(1));
            const etaMins = Math.ceil(data.routes[0].duration / 60);
            useResponderStore.getState().setHospitalRouteMetrics(distanceKm, etaMins);

            // Calculate map view bounds for OSRM route
            let minLng = coords[0][0], maxLng = coords[0][0], minLat = coords[0][1], maxLat = coords[0][1];
            coords.forEach((coord: number[]) => {
              if (coord[0] < minLng) minLng = coord[0];
              if (coord[0] > maxLng) maxLng = coord[0];
              if (coord[1] < minLat) minLat = coord[1];
              if (coord[1] > maxLat) maxLat = coord[1];
            });
            setRouteBounds([minLng, minLat, maxLng, maxLat]);
          }
        } catch (err) {
          console.error('[ResponderHome] Error fetching hospital route:', err);
        }
      };
      fetchRoute();
    } else {
      setRouteCoords(null);
      setRouteBounds(null);
    }
  }, [status, currentLocation, activeDispatch, targetHospital]);

  // Mock route coordinates from responder to incident
  const routeGeoJSON = {
    type: 'FeatureCollection',
    features: (routeCoords && routeCoords.length >= 2) ? [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoords
        }
      }
    ] : []
  };

  return (
    <View className="flex-1 bg-slate-50">
      <OfflineBanner />
      <StatusBar barStyle="dark-content" />

      {/* Map Layer */}
      <Map
        style={{ flex: 1 }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        logo={false}
        attribution={false}
        onPress={() => {
          if (isMarkerPress.current) return;
          setSelectedHospital(null);
        }}
        onRegionWillChange={(event) => {
          if ((event as any).properties?.isUserGesture) {
            setIsCameraCentered(false);
          }
        }}
      >
        {isCameraCentered && (
          (status === 'en_route' || status === 'to_hospital') && cameraMode === 'follow' ? (
            <Camera
              center={currentLocation}
              zoom={16.5}
              bearing={heading} // Follow phone's compass/heading orientation dynamically!
              duration={1000}
            />
          ) : routeBounds ? (
            <Camera
              bounds={routeBounds}
              padding={{ top: 120, bottom: 400, left: 40, right: 40 }}
              duration={1500}
            />
          ) : (
            <Camera
              center={currentLocation}
              zoom={14}
              duration={1500}
            />
          )
        )}

        {/* Route Line */}
        <GeoJSONSource id="routeSource" data={routeGeoJSON as any}>
          <Layer 
            id="routeLine" 
            type="line"
            paint={{
              'line-color': '#3B82F6',
              'line-width': 4
            }}
            layout={{
              'line-join': 'round',
              'line-cap': 'round'
            }}
          />
        </GeoJSONSource>

        {/* Responder Marker */}
        <Marker id="responderLocation" lngLat={currentLocation}>
          <View className="items-center justify-center relative">
            {/* Pulsing Aura */}
            <View className="absolute w-14 h-14 rounded-full bg-blue-500/20" />
            
            {/* Simple Vehicle Icon */}
            <View className="w-9 h-9 rounded-full items-center justify-center bg-blue-600 border-2 border-white shadow-lg">
              <Truck color="white" size={16} fill="white" />
            </View>
          </View>
        </Marker>

        {/* Destination Marker */}
        {activeDispatch && status !== 'to_hospital' && (
          <Marker 
            id="incidentLocation" 
            lngLat={[activeDispatch.coordinates.longitude, activeDispatch.coordinates.latitude]}
            onPress={() => {
              isMarkerPress.current = true;
              Alert.alert(
                "Incident & Reporter Details",
                `Incident: ${activeDispatch.type}\nReporter: ${activeDispatch.reporterName}\nLocation: ${activeDispatch.locationName}\nNature: ${activeDispatch.natureOfCall}\nPeople Involved: ${activeDispatch.peopleInvolved}`,
                [{ text: "Close", onPress: () => { isMarkerPress.current = false; } }]
              );
            }}
          >
            <View className="items-center justify-center relative">
              {status === 'en_route' && (
                <View className="absolute w-16 h-16 rounded-full border border-red-500/50 bg-red-500/10 border-dashed animate-pulse" />
              )}
              <View className="p-1 rounded-full border-2 border-red-200 bg-red-600 shadow-lg">
                <MapPin color="white" size={14} fill="white" />
              </View>
            </View>
          </Marker>
        )}

        {hospitals.map((hospital) => {
          const isTarget = status === 'to_hospital' && targetHospital?.id === hospital.id;
          const isSelected = selectedHospital?.id === hospital.id;
          return (
            <Marker 
              key={hospital.id} 
              id={hospital.id} 
              lngLat={[hospital.coordinates.longitude, hospital.coordinates.latitude]}
              onPress={() => {
                isMarkerPress.current = true;
                setSelectedHospital((prev: any) => prev?.id === hospital.id ? null : hospital);
                setTimeout(() => {
                  isMarkerPress.current = false;
                }, 300);
              }}
            >
              <View className="items-center justify-center">
                {/* Floating Tooltip Card */}
                {isSelected && (
                  <View className="absolute bottom-12 w-[220px] bg-white rounded-2xl p-4 shadow-xl border border-slate-200 z-50">
                    <View className="flex-row items-center mb-2">
                      <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3">
                        <Hospital size={20} color="#1E3A8A" variant="Bold" />
                      </View>
                      <Text className="text-sm font-bold text-[#1E3A8A] flex-1">{hospital.name}</Text>
                    </View>
                    <Text className="text-xs font-medium text-slate-500 mb-1">{hospital.address}</Text>
                    <Text className="text-xs font-medium text-slate-500">{hospital.phone}</Text>
                    
                    {status === 'to_hospital' && !targetHospital && (
                      <TouchableOpacity
                        onPress={() => {
                          setTargetHospital(hospital);
                          setSelectedHospital(null);
                        }}
                        className="mt-3 bg-blue-600 rounded-lg p-2 items-center"
                      >
                        <Text className="text-white text-xs font-bold">Select Hospital</Text>
                      </TouchableOpacity>
                    )}

                    {/* Tooltip Triangle Pointer */}
                    <View className="absolute -bottom-2 left-1/2 -ml-2 w-4 h-4 bg-white border-b border-r border-slate-200" style={{ transform: [{ rotate: '45deg' }] }} />
                  </View>
                )}

                <View className="items-center justify-center relative">
                  {isTarget && (
                    <View className="absolute w-16 h-16 rounded-full border border-red-500/50 bg-red-500/10 border-dashed animate-pulse" />
                  )}
                  <View className={`w-8 h-8 rounded-full items-center justify-center shadow-sm ${(isTarget || isSelected) ? 'bg-blue-600 shadow-blue-400 scale-110 border-2 border-white' : 'bg-slate-800 border-2 border-slate-600'} z-10`}>
                    <Hospital color={(isTarget || isSelected) ? "white" : "#94A3B8"} size={16} variant="Bold" />
                  </View>
                </View>
              </View>
            </Marker>
          );
        })}
      </Map>

      {/* Overlay UI */}
      <View className="absolute top-0 w-full" style={{ paddingTop: (StatusBar.currentHeight || 24) + 12 }} pointerEvents="box-none">
        
        {/* Top Header */}
        <View className="px-4 flex-row justify-between items-start pointer-events-auto">
          <View className="flex-row items-center bg-white/95 p-2 pl-2 pr-4 rounded-full backdrop-blur-xl border border-slate-200/80 shadow-sm">
            <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-2">
              <MapPin size={16} color="#1E3A8A" fill="#DBEAFE" />
            </View>
            <View>
              <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Your Location</Text>
              <Text className="text-slate-900 text-sm font-black tracking-tight">Baliwag City</Text>
            </View>
          </View>
          
          <View className="flex-row space-x-2">
            {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && (
              <TouchableOpacity 
                className="w-12 h-12 rounded-full bg-red-600 items-center justify-center border border-red-700 shadow-sm"
                onPress={async () => {
                  await supabase.auth.signOut();
                }}
              >
                <LogOut size={20} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              className="w-12 h-12 rounded-full bg-white/95 items-center justify-center backdrop-blur-xl border border-slate-200/80 shadow-sm"
              onPress={() => router.push('/support')}
            >
              <HelpCircle size={22} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-12 h-12 rounded-full bg-white/95 items-center justify-center backdrop-blur-xl border border-slate-200/80 shadow-sm relative"
              onPress={() => router.push('/notifications')}
            >
              <Bell size={22} color="#64748B" />
              {unreadCount > 0 && (
                <View className="absolute top-1.5 right-1.5 flex h-[18px] w-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 border-2 border-white">
                  <Text className="text-white text-[8px] font-black px-0.5 text-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Camera Mode Toggle Button */}
        {(status === 'en_route' || status === 'to_hospital') && (
          <View className="absolute right-6 top-[84px] pointer-events-auto" style={{ zIndex: 999 }}>
            <TouchableOpacity
              onPress={() => setCameraMode(prev => prev === 'follow' ? 'overview' : 'follow')}
              activeOpacity={0.85}
              className="w-11 h-11 bg-white/95 rounded-full shadow-lg border border-slate-200 items-center justify-center"
            >
              {cameraMode === 'follow' ? (
                <Compass size={20} color="#1E3A8A" strokeWidth={2.5} />
              ) : (
                <Eye size={20} color="#1E3A8A" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Floating Recenter Map Button */}
        {!isCameraCentered && (
          <View className="absolute right-6 top-[196px] pointer-events-auto" style={{ zIndex: 999 }}>
            <TouchableOpacity
              onPress={() => setIsCameraCentered(true)}
              activeOpacity={0.85}
              className="px-4 py-2.5 bg-blue-900 rounded-full shadow-lg border border-blue-700 items-center justify-center flex-row space-x-2"
            >
              <Compass size={16} color="white" strokeWidth={2.5} />
              <Text className="text-white text-xs font-bold">Recenter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Floating Simulation Button - Only visible in Developer Mode */}
        {process.env.EXPO_PUBLIC_DEV_MODE === 'true' && (status === 'en_route' || status === 'to_hospital') && (
          <View className="absolute right-6 top-[140px] pointer-events-auto" style={{ zIndex: 999 }}>
            <TouchableOpacity
              onPress={toggleSimulation}
              activeOpacity={0.85}
              className={`w-11 h-11 rounded-full shadow-lg border items-center justify-center ${isSimulating ? 'bg-orange-500 border-orange-400' : 'bg-white/95 border-slate-200'}`}
            >
              {isSimulating ? (
                <Pause size={20} color="white" fill="white" />
              ) : (
                <Play size={20} color="#1E3A8A" fill="transparent" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {status === 'to_hospital' && !targetHospital && (
          <View className="px-6 mt-4 pointer-events-auto">
            <View className="bg-orange-500/90 p-3.5 rounded-xl backdrop-blur-md border border-orange-400 shadow-lg shadow-black/10">
              <Text className="text-white font-bold text-xs text-center">Tap a hospital marker on the map to select destination</Text>
            </View>
          </View>
        )}

        {/* Profile Card / Dispatch Badge */}
        <View className="px-4 mt-4 pointer-events-auto">
          {status === 'idle' && (
            <View className="flex-row items-center justify-between bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-slate-200/50">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="relative">
                  <View className="w-12 h-12 rounded-full items-center justify-center bg-[#1E3A8A] shadow-sm">
                    <Text className="text-white font-black text-lg">{initials}</Text>
                  </View>
                  <View className="absolute top-0 right-0 bg-emerald-500 rounded-full p-1 shadow-md border-2 border-white">
                    <Check size={8} color="white" strokeWidth={5} />
                  </View>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-slate-900 text-lg font-black tracking-tight" numberOfLines={1}>{name}</Text>
                  <Text className="text-slate-500 text-[11px] font-bold tracking-widest uppercase mt-0.5">EMP-2026-0012</Text>
                </View>
              </View>
              <View className={`px-3 py-1.5 rounded-full border flex-row items-center shadow-sm shrink-0 ${
                profile?.dutyStatus === 'ON_DUTY'
                  ? "bg-green-50 border-green-200"
                  : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200"
              }`}>
                <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  profile?.dutyStatus === 'ON_DUTY'
                    ? "bg-green-500"
                    : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                      ? "bg-red-500"
                      : "bg-slate-500"
                }`} />
                <Text className={`text-[9px] font-black uppercase tracking-widest ${
                  profile?.dutyStatus === 'ON_DUTY'
                    ? "text-green-600"
                    : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                      ? "text-red-600"
                      : "text-slate-600"
                }`}>
                  {profile?.dutyStatus === 'ACTIVE_DISPATCH'
                    ? "Active Dispatch"
                    : profile?.dutyStatus === 'ON_DUTY'
                      ? "On Duty"
                      : "Off Duty"}
                </Text>
              </View>
            </View>
          )}

          {status !== 'idle' && activeDispatch && (
            <View className="flex-row items-center justify-between bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-xl border border-slate-200/50">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-slate-900 text-2xl font-black tracking-tight">{myVehicleId}</Text>
                  <View className="ml-3 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
                    <Text className="text-[#1E3A8A] text-[10px] font-black tracking-widest uppercase">
                      {status === 'en_route' ? 'Dispatched' : status === 'dispatch_offered' ? 'Incoming' : status === 'to_hospital' ? 'To Hospital' : 'On Scene'}
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-500 text-xs font-bold tracking-wider mt-1">{activeDispatch.id}</Text>
              </View>
            </View>
          )}
        </View>

        {status === 'to_hospital' && (
          <View className="absolute top-[50%] right-6 z-50 pointer-events-auto">
            <TouchableOpacity 
              onPress={() => useResponderStore.getState().startReport()}
              className="bg-blue-900/90 backdrop-blur-md rounded-2xl px-5 py-3.5 flex-row items-center border border-blue-700/50 shadow-lg shadow-black/20"
            >
              <FolderDown color="white" size={18} />
              <Text className="text-white font-bold ml-2">Fill Report</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* Sheets */}
      <DispatchSheet />
      {status === 'en_route' && <EnRouteSheet />}
      {status === 'on_scene' && <OnSceneSheet />}
      {status === 'to_hospital' && <ToHospitalSheet />}
      <ArrivalConfirmDialog />
      <IncidentReportForm />
    </View>
  );
}
