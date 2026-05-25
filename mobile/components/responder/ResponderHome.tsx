import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { MapPin, HelpCircle, Bell, ChevronRight, Check } from 'lucide-react-native';
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

export function ResponderHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, activeDispatch, targetHospital, setTargetHospital, simulateIncomingDispatch } = useResponderStore();
  const { profile } = useAuthStatus();
  
  // Mock initials
  const initials = profile?.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'RB';
  const name = profile?.fullName || 'Renzy Bastes';

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([120.895, 14.945]);
  const [isSearchingHospital, setIsSearchingHospital] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [routeBounds, setRouteBounds] = useState<any>(null);
  const isMarkerPress = useRef(false);

  const MOCK_HOSPITALS = [
    {
      id: 'hosp-1',
      name: 'Jose B. Lingad Memorial Hospital',
      coordinates: { latitude: 14.954, longitude: 120.902 },
      caters: false, // Simulates hospital being unable to cater
      address: '1669 Pearl St',
      phone: '0943 601 8271'
    },
    {
      id: 'hosp-2',
      name: 'Baliwag District Hospital',
      coordinates: { latitude: 14.960, longitude: 120.910 },
      caters: true, // Alternative hospital
      address: 'Carpa Rd, Baliwag',
      phone: '(044) 766 3457'
    }
  ];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchRouteAndAnimate = async (start: [number, number], end: [number, number]) => {
      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson`);
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates;
          setRouteCoords(coords);
          setCurrentLocation(coords[0]);
          
          // Calculate bounds for the entire route so map can zoom to fit it
          let minLng = coords[0][0];
          let maxLng = coords[0][0];
          let minLat = coords[0][1];
          let maxLat = coords[0][1];

          coords.forEach((coord: number[]) => {
            if (coord[0] < minLng) minLng = coord[0];
            if (coord[0] > maxLng) maxLng = coord[0];
            if (coord[1] < minLat) minLat = coord[1];
            if (coord[1] > maxLat) maxLat = coord[1];
          });
          
          // [west/minLng, south/minLat, east/maxLng, north/maxLat]
          setRouteBounds([minLng, minLat, maxLng, maxLat]);
          
          let index = 0;
          // Calculate interval based on number of points to keep animation roughly 5-10 seconds
          // Max out at 50ms per point minimum to look smooth
          const msPerPoint = Math.max(50, Math.min(300, 5000 / coords.length));
          
          interval = setInterval(() => {
            if (index < coords.length - 1) {
              index++;
              setCurrentLocation(coords[index]);
              setRouteCoords(coords.slice(index));
            } else {
              clearInterval(interval);
            }
          }, msPerPoint);
        }
      } catch (err) {
        console.error("Failed to fetch route", err);
      }
    };

    if (status === 'en_route') {
      fetchRouteAndAnimate([120.895, 14.945], [120.9029, 14.9538]);
    } else if (status === 'to_hospital') {
      const simulateHospitalSearch = async () => {
        setIsSearchingHospital(true);
        setSearchStatus('Locating nearest hospital...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const nearest = MOCK_HOSPITALS[0];
        setSearchStatus(`Contacting ${nearest.name}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (!nearest.caters) {
          setSearchStatus(`${nearest.name} is at full capacity. Rerouting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const alternative = MOCK_HOSPITALS[1];
          setSearchStatus(`Confirmed with ${alternative.name}`);
          setTargetHospital(alternative);
          await new Promise(resolve => setTimeout(resolve, 1000));
          setIsSearchingHospital(false);
          fetchRouteAndAnimate([120.9029, 14.9538], [alternative.coordinates.longitude, alternative.coordinates.latitude]);
        } else {
          setTargetHospital(nearest);
          setIsSearchingHospital(false);
          fetchRouteAndAnimate([120.9029, 14.9538], [nearest.coordinates.longitude, nearest.coordinates.latitude]);
        }
      };
      
      simulateHospitalSearch();
    } else if (status === 'on_scene') {
      setCurrentLocation([120.9029, 14.9538]);
      setRouteCoords(null);
      setRouteBounds(null);
    } else if (status === 'idle') {
      setCurrentLocation([120.895, 14.945]);
      setRouteCoords(null);
      setRouteBounds(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

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
        {routeBounds ? (
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
            <View className="absolute w-12 h-12 rounded-full bg-blue-500/20" />
            <View className="p-1.5 rounded-full border-2 border-white bg-blue-600 shadow-md">
              <View className="w-2.5 h-2.5 rounded-full bg-white" />
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
        {MOCK_HOSPITALS.map((hospital) => {
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

        {isSearchingHospital && (
          <View className="px-6 mt-4 pointer-events-auto">
            <View className="bg-orange-500/90 p-3 rounded-xl backdrop-blur-md border border-orange-400 shadow-sm">
              <Text className="text-white font-bold text-xs">{searchStatus}</Text>
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
          {status === 'idle' && (
            <TouchableOpacity 
              onPress={simulateIncomingDispatch}
              className="mt-4 bg-blue-600/90 rounded-xl p-3 items-center backdrop-blur-md border border-blue-500/50"
            >
              <Text className="text-white font-bold text-sm">TEST: Trigger Dispatch</Text>
            </TouchableOpacity>
          )}

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
