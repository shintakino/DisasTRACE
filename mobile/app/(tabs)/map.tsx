import React, { useState, useRef } from 'react';
import { View, Text, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { MapPin } from 'lucide-react-native';
import { Hospital } from 'iconsax-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useResponderStore } from '../../stores/useResponderStore';

const hospitals = [
  { id: 1, name: 'Baliuag District Hospital', address: '1669 Pearl St', phone: '0943 601 8271', lat: 14.954, lng: 120.902 },
  { id: 2, name: 'Carpa Hospital', address: 'Baliwag, Bulacan', phone: '0943 601 8271', lat: 14.945, lng: 120.890 },
  { id: 3, name: 'Rugay General Hospital', address: 'Carpa Rd', phone: '(044) 766 3457', lat: 14.935, lng: 120.910 },
];

export default function MapScreen() {
  const { profile, role } = useAuthStatus();
  const { activeDispatch, status } = useResponderStore();
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const isMarkerPress = useRef(false);

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
            >
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  isMarkerPress.current = true;
                  setSelectedHospital(h);
                  setTimeout(() => {
                    isMarkerPress.current = false;
                  }, 300);
                }}
                className={`flex-row items-center bg-white p-1 pr-3 rounded-full border shadow-sm ${isSelected ? 'border-blue-400 shadow-blue-200 scale-105' : 'border-slate-200'}`}
              >
                <View className={`w-7 h-7 rounded-full items-center justify-center ${isSelected ? 'bg-blue-600' : 'bg-[#DC2626]'}`}>
                  <Hospital color="white" size={14} variant="Bold" />
                </View>
                <Text className={`ml-2 text-[10px] font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            </Marker>
          );
        })}

        <Marker id="userLocation" lngLat={[120.880, 14.940]}>
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
                  <View className="w-3.5 h-3.5 bg-green-500 rounded-full" />
                </View>
              </View>
              <View className="flex-1 pt-1">
                <Text className="text-lg font-bold text-[#1E3A8A]">{displayName}</Text>
                <Text className="text-sm font-medium text-slate-500 mt-1" numberOfLines={1}>{address}</Text>
                <Text className="text-xs font-bold text-[#1E3A8A] mt-1">Responder Status: On Duty</Text>
              </View>
            </React.Fragment>
          )}
        </View>
      </View>
    </View>
  );
}
