import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity } from 'react-native';
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
    <View className="flex-1 bg-[#16203A]">
      <View className="absolute top-0 w-full z-10 px-6" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60 }} pointerEvents="none">
        <Text className="text-3xl font-bold text-white shadow-sm">Incident Map</Text>
      </View>

      <Map
        style={{ flex: 1 }}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
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

      <View className="absolute bottom-28 w-full px-6">
        <View className="bg-white rounded-3xl p-6 shadow-xl flex-row items-center">
          <View className="w-12 border-t-2 border-slate-200 absolute top-3 left-1/2 -translate-x-6" />
          
          {selectedHospital ? (
            <React.Fragment>
              <View className="w-16 h-16 bg-blue-50 rounded-2xl items-center justify-center mr-4">
                <Hospital size={32} color="#1E3A8A" variant="Bold" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-[#1E3A8A] mb-1">{selectedHospital.name}</Text>
                <Text className="text-sm font-medium text-[#1E3A8A]">{selectedHospital.address} · {selectedHospital.phone}</Text>
              </View>
            </React.Fragment>
          ) : activeDispatch ? (
            <React.Fragment>
              <View className="w-16 h-16 bg-[#EF4444] rounded-full items-center justify-center mr-4 relative">
                <Text className="text-white text-xl font-black">{activeDispatch.reporterInitials || 'R'}</Text>
                <View className="absolute top-0 right-0 w-5 h-5 bg-white rounded-full items-center justify-center">
                  <View className="w-3.5 h-3.5 bg-[#EF4444] rounded-full" />
                </View>
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-lg font-bold text-[#EF4444]">{activeDispatch.type}</Text>
                <Text className="text-sm font-medium text-slate-700 mt-1" numberOfLines={1}>{activeDispatch.locationName}</Text>
                <Text className="text-xs font-bold text-slate-500 mt-1">Active Incident: {activeDispatch.id}</Text>
              </View>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <View className="w-16 h-16 bg-[#1E3A8A] rounded-full items-center justify-center mr-4 relative">
                <Text className="text-white text-xl font-bold">{initials}</Text>
                <View className="absolute top-0 right-0 w-5 h-5 bg-white rounded-full items-center justify-center">
                  <View className={`w-3.5 h-3.5 rounded-full ${
                    profile?.dutyStatus === 'ON_DUTY'
                      ? 'bg-green-500'
                      : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                        ? 'bg-red-500'
                        : 'bg-slate-400'
                  }`} />
                </View>
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-lg font-bold text-[#1E3A8A]">{displayName}</Text>
                <Text className="text-sm font-medium text-slate-500 mt-1" numberOfLines={1}>{address}</Text>
                <Text className={`text-xs font-bold mt-1 ${
                  profile?.dutyStatus === 'ON_DUTY'
                    ? 'text-green-600'
                    : profile?.dutyStatus === 'ACTIVE_DISPATCH'
                      ? 'text-red-600'
                      : 'text-slate-500'
                }`}>
                  Responder Status: {
                    profile?.dutyStatus === 'ACTIVE_DISPATCH'
                      ? 'Active Dispatch'
                      : profile?.dutyStatus === 'ON_DUTY'
                        ? 'On Duty (Standby)'
                        : 'Off Duty'
                  }
                </Text>
              </View>
            </React.Fragment>
          )}
        </View>
      </View>
    </View>
  );
}
