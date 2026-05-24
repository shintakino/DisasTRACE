import React, { useRef, useEffect } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, Marker, ShapeSource, LineLayer } from '@maplibre/maplibre-react-native';
import { MapPin, HelpCircle, Bell, ChevronRight, Check } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { DispatchSheet } from './DispatchSheet';
import { EnRouteSheet } from './EnRouteSheet';
import { OnSceneSheet } from './OnSceneSheet';
import { ArrivalConfirmDialog } from './ArrivalConfirmDialog';
import { LinearGradient } from 'expo-linear-gradient';

export function ResponderHome() {
  const insets = useSafeAreaInsets();
  const { status, activeDispatch, simulateIncomingDispatch } = useResponderStore();
  const { profile } = useAuthStatus();
  
  // Mock initials
  const initials = profile?.fullName ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'RB';
  const name = profile?.fullName || 'Renzy Bastes';

  // DEV ONLY: Auto-trigger dispatch for testing if idle
  useEffect(() => {
    if (status === 'idle') {
      const timer = setTimeout(() => {
        simulateIncomingDispatch();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, simulateIncomingDispatch]);

  const showRoute = status === 'en_route' || status === 'on_scene';

  // Mock route coordinates from responder to incident
  const routeGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [120.895, 14.945], // Responder
            [120.9029, 14.9538] // Incident
          ]
        }
      }
    ]
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
      >
        <Camera
          initialViewState={{
            center: [120.898, 14.949],
            zoom: 13,
          }}
          animationDuration={1000}
        />

        {/* Route Line */}
        {showRoute && (
          <ShapeSource id="routeSource" shape={routeGeoJSON as any}>
            <LineLayer 
              id="routeLine" 
              style={{
                lineColor: '#3B82F6',
                lineWidth: 4,
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
          </ShapeSource>
        )}

        {/* Responder Marker */}
        <Marker id="responderLocation" lngLat={[120.895, 14.945]}>
          <View className="items-center justify-center relative">
            <View className="absolute w-12 h-12 rounded-full bg-blue-500/20" />
            <View className="p-1.5 rounded-full border-2 border-white bg-blue-600 shadow-md">
              <View className="w-2.5 h-2.5 rounded-full bg-white" />
            </View>
          </View>
        </Marker>

        {/* Incident Marker (visible if dispatched) */}
        {activeDispatch && (
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
            <TouchableOpacity className="w-10 h-10 rounded-full bg-blue-900/40 items-center justify-center backdrop-blur-md border border-blue-800/50">
              <Bell size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

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

          {status !== 'idle' && activeDispatch && (
            <View className="flex-row items-center justify-between bg-transparent">
              <View>
                <View className="flex-row items-center">
                  <Text className="text-white text-2xl font-black shadow-sm tracking-tight">AMB-001</Text>
                  <View className="ml-3 bg-white px-3 py-1 rounded-full shadow-sm">
                    <Text className="text-[#1E3A8A] text-[10px] font-black tracking-widest uppercase">
                      {status === 'en_route' ? 'Dispatched' : 'On Scene'}
                    </Text>
                  </View>
                </View>
                <Text className="text-white/80 text-xs font-medium tracking-wider mt-1">{activeDispatch.id}</Text>
              </View>
            </View>
          )}
        </View>

        {/* New Report Banner (Only in Dispatch Offered state) */}
        {status === 'dispatch_offered' && activeDispatch && (
          <View className="px-6 mt-6 pointer-events-auto">
            <TouchableOpacity activeOpacity={0.9}>
              <LinearGradient
                colors={['#DC2626', '#991B1B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-2xl p-4 flex-row items-center justify-between shadow-lg shadow-red-900/30"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-2.5 h-2.5 rounded-full bg-white mr-3 animate-pulse" />
                  <View>
                    <Text className="text-white font-bold text-base mb-0.5">New Report</Text>
                    <Text className="text-white/90 text-xs font-medium">{activeDispatch.locationName} · Tap to respond</Text>
                  </View>
                </View>
                <ChevronRight color="white" size={24} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sheets */}
      <DispatchSheet />
      <EnRouteSheet />
      <OnSceneSheet />
      <ArrivalConfirmDialog />
    </View>
  );
}
