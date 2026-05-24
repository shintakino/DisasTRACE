import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useLocationPermission } from '../../hooks/use-location-permission';
import { LocationPermissionDrawer } from '../../components/dashboard/LocationPermissionDrawer';
import { HelpButton } from '../../components/dashboard/HelpButton';
import { MapPin, HelpCircle, Bell, Shield, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ResponderHome } from '../../components/responder/ResponderHome';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStatus();
  const { isLocationGateActive, requestPermissions } = useLocationPermission();
  
  const role = (user?.app_metadata?.role as string) || 'public_user';

  // Fallback for initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = profile?.fullName ? getInitials(profile.fullName) : '??';

  if (role === 'ambulance_responder') {
    return <ResponderHome />;
  }

  return (
    <View className="flex-1 bg-[#1E3A8A]">
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <SafeAreaView>
        <View className="px-6 py-4 flex-row justify-between items-start">
          <View>
            <View className="flex-row items-center">
              <MapPin size={20} color="white" opacity={0.8} />
              <Text className="text-white/80 text-xs ml-1 uppercase tracking-wider">Your Location</Text>
            </View>
            <Text className="text-white text-md font-bold mt-0.5">Baliwag City</Text>
          </View>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity className="p-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <HelpCircle size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-2" 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Card */}
        <View className="px-6 pb-8 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="relative">
              <View className="w-14 h-14 rounded-full border border-white/40 items-center justify-center bg-[#1E3A8A]">
                <Text className="text-white font-black text-xl tracking-tighter">{initials}</Text>
              </View>
              <View className="absolute top-0 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Check size={8} color="#1E3A8A" strokeWidth={5} />
              </View>
            </View>
            
            <View className="ml-4">
              <Text className="text-white text-lg font-bold leading-tight tracking-tight">
                {profile?.fullName || 'Eloisa Guibani'}
              </Text>
              <Text className="text-white/60 text-sm">
                {profile?.address || 'Barangay Paitan'}
              </Text>
            </View>
          </View>

          <View className="bg-white/20 px-3 py-1 rounded-full border border-white/5">
            <Text className="text-white text-[10px] font-black tracking-widest uppercase">Online</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Report Canvas */}
      <View className="flex-1 bg-white rounded-t-[32px] px-6 pt-10">
        <Text className="text-slate-400 text-[11px] font-medium text-center uppercase tracking-[2px] mb-12">
          Incident Reporting
        </Text>

        <View className="flex-1 items-center pt-2">
          <HelpButton onPress={() => router.push('/help/camera')} />
          
          <View className="mt-14 px-4">
            <Text className="text-slate-500 text-center text-sm leading-relaxed">
              Takes a <Text className="font-bold text-slate-700">live photo</Text> of the scene and files a report. Help reaches you faster.
            </Text>
          </View>
        </View>

        {/* Service Improvement Banner */}
        <View className="mb-10 overflow-hidden rounded-2xl shadow-sm shadow-red-900/10">
          <LinearGradient
            colors={['#B91C1C', '#991B1B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-white font-bold text-base">Help us improve our service</Text>
                <Text className="text-white/90 text-xs mt-0.5 leading-snug">
                  Spotted an issue in your area? Contact us so we can fix it.
                </Text>
              </View>
              <View className="bg-white/10 p-2 rounded-xl border border-white/10">
                <HelpCircle size={20} color="white" opacity={0.8} />
              </View>
            </View>
            
            <TouchableOpacity 
              className="bg-[#1E3A8A] rounded-xl py-2.5 items-center shadow-sm active:bg-blue-900"
              onPress={() => console.log('Contact Us pressed')}
            >
              <Text className="text-white font-bold text-sm">Contact Us</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>

      {/* Location Gate Overlay */}
      <LocationPermissionDrawer 
        isVisible={isLocationGateActive} 
        onRequestPermission={requestPermissions}
      />
    </View>
  );
}
