import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Truck, ShieldCheck } from 'lucide-react-native';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#1E3A8A]">
      <StatusBar barStyle="light-content" />
      <SafeAreaView>
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="flex-row items-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft color="white" size={24} />
            <Text className="text-white font-bold text-xl ml-2 tracking-tight">Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text className="text-white text-sm font-medium">Clear All</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* TODAY SECTION */}
        <View className="px-6 pt-8 pb-4">
          <Text className="text-slate-900 font-bold text-sm tracking-wider uppercase mb-5">Today</Text>
          
          {/* Notification Item 1 */}
          <View className="bg-white rounded-3xl border border-[#E2E8F0] p-5 mb-4 flex-row">
            <View className="bg-[#EEF2FF] w-14 h-14 rounded-2xl items-center justify-center mr-4">
              <Truck size={24} color="#1E3A8A" />
            </View>
            <View className="flex-1 justify-center">
              <View className="flex-row justify-between items-start mb-1.5">
                <Text className="font-bold text-[17px] text-slate-900 flex-1 pr-2">AMB-001 Dispatched</Text>
                <View className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] mt-1.5" />
              </View>
              <Text className="text-slate-600 text-[13px] leading-[18px] mb-3">
                Ambulance is on the way. ETA approx. 8 minutes. Driver: Bastes, R., Paramedic: Guanzing, C.
              </Text>
              <Text className="text-[#1E3A8A]/60 font-medium text-[11px]">
                09:46 AM · 25 min ago
              </Text>
            </View>
          </View>

          {/* Notification Item 2 */}
          <View className="bg-white rounded-3xl border border-[#E2E8F0] p-5 mb-4 flex-row">
            <View className="bg-[#EEF2FF] w-14 h-14 rounded-2xl items-center justify-center mr-4">
              <ShieldCheck size={24} color="#1E3A8A" />
            </View>
            <View className="flex-1 justify-center">
              <View className="flex-row justify-between items-start mb-1.5">
                <Text className="font-bold text-[17px] text-slate-900 flex-1 pr-2">Report Verified</Text>
                <View className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] mt-1.5" />
              </View>
              <Text className="text-slate-600 text-[13px] leading-[18px] mb-3">
                DR-2024-0847 has been verified by CDRRMO. Classified as Emergency. Dispatch initiated.
              </Text>
              <Text className="text-[#1E3A8A]/60 font-medium text-[11px]">
                09:45 AM · 26 min ago
              </Text>
            </View>
          </View>
        </View>

        {/* YESTERDAY SECTION */}
        <View className="px-6 pt-4">
          <Text className="text-slate-900 font-bold text-sm tracking-wider uppercase mb-5">Yesterday</Text>
        </View>
      </ScrollView>
    </View>
  );
}
