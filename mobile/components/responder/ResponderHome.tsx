import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { MapPin, HelpCircle, Bell, ChevronRight, Check, Truck, Compass, Eye, Play, Pause } from 'lucide-react-native';
import { Hospital } from 'iconsax-react-native';
import { useResponderStore } from '../../stores/useResponderStore';
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

export function ResponderHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, activeDispatch, targetHospital, setTargetHospital } = useResponderStore();
  const { profile, user, role } = useAuthStatus();
  
  // Mock initials
  const initials = profile?.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'RB';
  const name = profile?.fullName || 'Renzy Bastes';

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([120.895, 14.945]);
  const [heading, setHeading] = useState<number>(0);
  const [isSearchingHospital, setIsSearchingHospital] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [routeBounds, setRouteBounds] = useState<any>(null);
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  const isMarkerPress = useRef(false);
  const [hospitals, setHospitals] = useState<any[]>([]);


  // Simulated Drive Telemetry properties
  const [isSimulating, setIsSimulating] = useState(false);
  const isSimulatingRef = useRef(false);
  const simIntervalRef = useRef<any>(null);
  const simIndexRef = useRef<number>(0);

  const startSimulation = (coords: [number, number][]) => {
    if (coords.length < 2) return;
    setIsSimulating(true);
    isSimulatingRef.current = true;
    simIndexRef.current = 0;
    
    // Complete the path in approximately 15 steps (~45 seconds)
    const stepSize = Math.max(1, Math.floor(coords.length / 15));
    
    // Connect to the resident telemetry channel
    const telemetryChannel = supabase.channel(`incident-tracking:${activeDispatch?.id}`);
    telemetryChannel.subscribe();

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

      // 1. Broadcast telemetry to the resident
      telemetryChannel.send({
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

      // 2. Sync to central DB cache
      const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
      const { data: { session } } = await supabase.auth.getSession();
      const reqHeaders: any = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }
      fetch(`${apiUrl}/responder/location`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          latitude: currentCoord[1],
          longitude: currentCoord[0]
        })
      }).catch(err => console.log('[Simulation] Telemetry DB sync failed:', err));

    }, 3000);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
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
    };
  }, []);

  // Auto-stop simulation if status changes to non-driving states
  useEffect(() => {
    if (status !== 'en_route' && status !== 'to_hospital') {
      stopSimulation();
    }
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
                assignedAmbulance: inc.assigned_ambulance || 'AMB-001',
              }
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
                assignedAmbulance: inc.assigned_ambulance || 'AMB-001',
              }
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
    targetHospital
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
            
            // Mock coordinates in Baliwag if user is outside the city (for developer convenience)
            if (lat < 14.90 || lat > 15.00 || lng < 120.80 || lng > 121.00) {
              lat = 14.954;
              lng = 120.902;
            }
            
            setCurrentLocation([lng, lat]);
            if (loc.coords.heading !== null && loc.coords.heading !== undefined) {
              setHeading(loc.coords.heading);
            }
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
    <View className="flex-1 bg-[#16203A]">
      <OfflineBanner />
      <StatusBar barStyle="light-content" />

      {/* Map Layer */}
      <Map
        style={{ flex: 1 }}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        logo={false}
        attribution={false}
        onPress={() => {
          if (isMarkerPress.current) return;
          setSelectedHospital(null);
        }}
      >
        {(status === 'en_route' || status === 'to_hospital') && cameraMode === 'follow' ? (
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
        )}

        {/* Route Line */}
        <GeoJSONSource id="routeSource" data={routeGeoJSON as any}>
          <Layer 
            id="routeLine" 
            type="line"
            paint={{
              'line-color': status === 'to_hospital' ? '#FFFFFF' : '#3B82F6',
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
            
            {/* Floating Vehicle Pill Identifier */}
            <View className="flex-row items-center bg-white py-1 px-2.5 rounded-full border border-blue-200 shadow-lg">
              <View className="w-6 h-6 rounded-full items-center justify-center bg-blue-600">
                <Truck color="white" size={11} fill="white" />
              </View>
              <Text className="ml-1.5 text-[9px] font-extrabold text-blue-900 uppercase tracking-wider">
                {activeDispatch?.assignedAmbulance || 'AMB-001'}
              </Text>
            </View>
          </View>
        </Marker>

        {/* Destination Marker */}
        {activeDispatch && status !== 'to_hospital' && (
          <Marker id="incidentLocation" lngLat={[activeDispatch.coordinates.longitude, activeDispatch.coordinates.latitude]}>
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

        {/* All Hospitals Markers */}
        {hospitals.map((hospital) => {
          const isTarget = status === 'to_hospital' && targetHospital?.id === hospital.id;
          const isSelected = selectedHospital?.id === hospital.id;
          return (
            <Marker key={hospital.id} id={hospital.id} lngLat={[hospital.coordinates.longitude, hospital.coordinates.latitude]}>
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

                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    isMarkerPress.current = true;
                    setSelectedHospital((prev: any) => prev?.id === hospital.id ? null : hospital);
                    setTimeout(() => {
                      isMarkerPress.current = false;
                    }, 300);
                  }}
                  className="items-center justify-center relative"
                >
                  {isTarget && (
                    <View className="absolute w-16 h-16 rounded-full border border-red-500/50 bg-red-500/10 border-dashed animate-pulse" />
                  )}
                  <View className={`w-8 h-8 rounded-full items-center justify-center shadow-sm ${(isTarget || isSelected) ? 'bg-blue-600 shadow-blue-400 scale-110 border-2 border-white' : 'bg-slate-800 border-2 border-slate-600'} z-10`}>
                    <Hospital color={(isTarget || isSelected) ? "white" : "#94A3B8"} size={16} variant="Bold" />
                  </View>
                </TouchableOpacity>
              </View>
            </Marker>
          );
        })}
      </Map>

      {/* Overlay UI */}
      <View className="absolute top-0 w-full" style={{ paddingTop: Math.max(insets.top, 20) }} pointerEvents="box-none">
        
        {/* Top Header */}
        <View className="px-6 flex-row justify-between items-start pointer-events-auto">
          <View className="flex-row items-center bg-blue-900/40 p-2 pl-1 pr-4 rounded-full backdrop-blur-md border border-blue-800/50">
            <View className="w-8 h-8 rounded-full bg-white items-center justify-center mr-2 shadow-sm">
              <MapPin size={16} color="#1E3A8A" fill="#1E3A8A" />
            </View>
            <View>
              <Text className="text-white/80 text-[10px] uppercase font-semibold">Your Location</Text>
              <Text className="text-white text-sm font-bold">Baliwag City</Text>
            </View>
          </View>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity className="w-10 h-10 rounded-full bg-blue-900/40 items-center justify-center backdrop-blur-md border border-blue-800/50">
              <HelpCircle size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-10 h-10 rounded-full bg-blue-900/40 items-center justify-center backdrop-blur-md border border-blue-800/50"
              onPress={() => router.push('/notifications')}
            >
              <Bell size={20} color="white" />
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

        {/* Floating Simulation Button */}
        {(status === 'en_route' || status === 'to_hospital') && (
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
        <View className="px-6 mt-6 pointer-events-auto">
          {status === 'idle' && (
            <View className="flex-row items-center justify-between bg-transparent">
              <View className="flex-row items-center">
                <View className="relative">
                  <View className="w-14 h-14 rounded-full border border-white/30 items-center justify-center bg-blue-900/80 backdrop-blur-md">
                    <Text className="text-white font-black text-xl">{initials}</Text>
                  </View>
                  <View className="absolute top-0 right-0 bg-white rounded-full p-0.5 shadow-sm">
                    <Check size={10} color="#1E3A8A" strokeWidth={4} />
                  </View>
                </View>
                <View className="ml-3">
                  <Text className="text-white text-lg font-bold shadow-sm">{name}</Text>
                  <Text className="text-white/70 text-xs font-medium tracking-wider">EMP-2026-0012</Text>
                </View>
              </View>
              <View className="bg-red-200 px-3 py-1.5 rounded-full shadow-sm">
                <Text className="text-red-900 text-[10px] font-black tracking-widest uppercase">On Duty</Text>
              </View>
            </View>
          )}

          {/* DEV ONLY: Manual dispatch trigger */}


          {status !== 'idle' && activeDispatch && (
            <View className="flex-row items-center justify-between bg-transparent">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-white text-2xl font-black shadow-sm tracking-tight">AMB-001</Text>
                  <View className="ml-3 bg-white px-3 py-1 rounded-full shadow-sm">
                    <Text className="text-[#1E3A8A] text-[10px] font-black tracking-widest uppercase">
                      {status === 'en_route' ? 'Dispatched' : status === 'dispatch_offered' ? 'Incoming' : status === 'to_hospital' ? 'To Hospital' : 'On Scene'}
                    </Text>
                  </View>
                </View>
                <Text className="text-white/80 text-xs font-medium tracking-wider mt-1">{activeDispatch.id}</Text>
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
