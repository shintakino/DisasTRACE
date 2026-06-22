import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity, Image } from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { MapPin } from 'lucide-react-native';
import { Hospital } from 'iconsax-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useResponderStore } from '../../stores/useResponderStore';
import { supabase } from '../../lib/supabase';


import * as Location from 'expo-location';

export default function MapScreen() {
  const { profile, role, isLoaded, user } = useAuthStatus();
  const { activeDispatch, status } = useResponderStore();
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const isMarkerPress = useRef(false);

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([120.880, 14.940]);

  useEffect(() => {
    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    async function startTracking() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (current && current.coords && isMounted) {
            setUserLocation([current.coords.longitude, current.coords.latitude]);
          }

          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 10000,
              distanceInterval: 10,
            },
            (loc) => {
              if (loc && loc.coords && isMounted) {
                setUserLocation([loc.coords.longitude, loc.coords.latitude]);
              }
            }
          );
        }
      } catch (e) {
        console.error('[MapScreen] Failed to watch user location:', e);
      }
    }

    startTracking();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

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
        setHospitals(data);
      } catch (err) {
        console.error("Error fetching mobile map hospitals:", err);
      }
    };

    if (isLoaded && user) {
      fetchHospitals();
    }
  }, [isLoaded, user]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = profile?.fullName ? getInitials(profile.fullName) : 'RB';
  const displayName = profile?.fullName || 'Renzy Bastes';
  const address = profile?.address || 'Baliwag City, Bulacan';

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" />
      <View className="absolute top-0 w-full z-10 px-6" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60 }} pointerEvents="none">
        <Text className="text-3xl font-black text-slate-900 tracking-tight shadow-sm">Incident Map</Text>
      </View>

      <Map
        style={{ flex: 1 }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onPress={() => {
          if (isMarkerPress.current) return;
          setSelectedHospital(null);
        }}
        logo={false}
        attribution={true}
      >
        <Camera
          initialViewState={{
            center: [120.895, 14.945],
            zoom: 13,
          }}
        />

        {hospitals.map(h => {
          const isSelected = selectedHospital?.id === h.id;
          return (
            <Marker
              key={h.id}
              id={`hospital-${h.id}`}
              lngLat={[h.lng, h.lat]}
              onPress={() => {
                isMarkerPress.current = true;
                setSelectedHospital((prev: any) => prev?.id === h.id ? null : h);
                setTimeout(() => {
                  isMarkerPress.current = false;
                }, 300);
              }}
            >
              <View 
                className={`flex-row items-center bg-white p-1 rounded-full border shadow-sm ${isSelected ? 'pr-3 border-blue-400 shadow-blue-200 scale-105' : 'border-slate-200'}`}
              >
                <View className={`w-7 h-7 rounded-full items-center justify-center ${isSelected ? 'bg-blue-600' : 'bg-[#DC2626]'}`}>
                  <Hospital color="white" size={14} variant="Bold" />
                </View>
                {isSelected && (
                  <Text className="ml-2 text-[10px] font-bold text-blue-700">
                    {h.name}
                  </Text>
                )}
              </View>
            </Marker>
          );
        })}

        <Marker id="userLocation" lngLat={userLocation}>
          <View className="items-center justify-center relative">
            <View className="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping" />
            <View className="p-1 rounded-full border-2 border-red-200 bg-red-500 shadow-lg">
              <MapPin color="white" size={16} fill="white" />
            </View>
          </View>
        </Marker>
      </Map>

      <View className="absolute bottom-0 w-full">
        <View className="bg-white rounded-t-[32px] pt-4 pb-24 px-6 shadow-2xl shadow-indigo-900/20 border border-slate-100 flex-col">
          {/* Handle bar for bottom sheet aesthetic */}
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-5" />
          
          <View className="flex-row items-center">
            {selectedHospital ? (
              <React.Fragment>
                <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mr-4 border-2 border-white shadow-sm">
                  <Hospital size={30} color="#312e81" variant="Bold" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-[#312e81] mb-0.5">{selectedHospital.name}</Text>
                  <Text className="text-sm font-medium text-[#4338ca] opacity-90">{selectedHospital.address}</Text>
                  <Text className="text-xs font-medium text-[#4f46e5] opacity-80 mt-0.5">{selectedHospital.phone}</Text>
                </View>
              </React.Fragment>
            ) : activeDispatch ? (
              <React.Fragment>
                <View className="w-16 h-16 bg-[#ef4444] rounded-full items-center justify-center mr-4 border-2 border-white shadow-sm relative">
                  <Text className="text-white text-2xl font-black">{activeDispatch.reporterInitials || 'R'}</Text>
                  <View className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full items-center justify-center shadow-sm">
                    <View className="w-2.5 h-2.5 bg-[#ef4444] rounded-full" />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-black text-[#7f1d1d]">{activeDispatch.type}</Text>
                  <Text className="text-sm font-medium text-[#991b1b] opacity-90 mt-0.5" numberOfLines={1}>{activeDispatch.locationName}</Text>
                  <Text className="text-xs font-bold text-[#b91c1c] opacity-80 mt-0.5">Active Incident: {activeDispatch.id}</Text>
                </View>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <View className="w-16 h-16 bg-[#312e81] rounded-full items-center justify-center mr-4 border-2 border-white shadow-sm relative">
                  {user?.user_metadata?.avatar_url ? (
                    <Image 
                      source={{ uri: user.user_metadata.avatar_url }} 
                      style={{ width: '100%', height: '100%', borderRadius: 32 }} 
                    />
                  ) : (
                    <Text className="text-white text-2xl font-black">{initials}</Text>
                  )}
                  <View className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full items-center justify-center shadow-sm">
                    <View className={`w-2.5 h-2.5 rounded-full ${
                      role === 'ambulance_responder'
                        ? (profile?.dutyStatus === 'ON_DUTY'
                          ? 'bg-emerald-500'
                          : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                            ? 'bg-red-500'
                            : 'bg-slate-400')
                        : 'bg-emerald-500'
                    }`} />
                  </View>
                </View>
                <View className="flex-1 justify-center">
                  <Text className="text-[17px] font-bold text-[#2e1065]">{displayName}</Text>
                  <Text className="text-[15px] font-medium text-[#4c1d95] mt-0.5" numberOfLines={1}>{address}</Text>
                  {role === 'ambulance_responder' ? (
                    <Text className={`text-[13px] font-bold mt-0.5 ${
                      profile?.dutyStatus === 'ON_DUTY'
                        ? 'text-emerald-600'
                        : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                          ? 'text-red-600'
                          : 'text-slate-500'
                    }`}>
                      {profile?.dutyStatus === 'ACTIVE_DISPATCH'
                        ? 'Active Dispatch'
                        : profile?.dutyStatus === 'ON_DUTY'
                          ? 'On Duty (Standby)'
                          : 'Off Duty'}
                    </Text>
                  ) : (
                    <Text className="text-[13px] font-medium text-[#5b21b6] opacity-80 mt-0.5">
                      Since Sun 6:41pm
                    </Text>
                  )}
                </View>
              </React.Fragment>
            )}
          </View>
          
          {/* Subtle divider below profile section as seen in reference */}
          <View className="w-full h-[1px] bg-slate-100 mt-6" />
        </View>
      </View>
    </View>
  );
}
