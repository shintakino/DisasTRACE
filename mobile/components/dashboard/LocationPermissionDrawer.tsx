import React from 'react';
import { View, Text, TouchableOpacity, Linking, Modal } from 'react-native';
import { MapPin, ChevronRight, Check } from 'lucide-react-native';

interface LocationPermissionDrawerProps {
  isVisible: boolean;
}

export function LocationPermissionDrawer({ isVisible }: LocationPermissionDrawerProps) {
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="slide"
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View className="bg-white rounded-t-[40px] p-8 h-[95%]">
          <View className="items-center mb-8">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full mb-8" />
            <View className="bg-blue-50 p-6 rounded-full mb-6">
              <MapPin size={40} color="#1E3A8A" fill="#1E3A8A" />
            </View>
            <Text className="text-3xl font-black text-[#1E3A8A] text-center px-4">
              Set Location to 'Always'
            </Text>
            <Text className="text-slate-500 text-base text-center mt-4 px-6 leading-relaxed">
              DisasTRACE needs 'Always' location access to provide accurate emergency response and real-time assistance.
            </Text>
          </View>

          <View className="space-y-6">
            <View>
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">Step 1</Text>
              <View className="border border-slate-100 rounded-2xl p-5 flex-row items-center justify-between bg-slate-50">
                <View className="flex-row items-center">
                  <View className="bg-blue-100 p-2 rounded-lg mr-3">
                    <MapPin size={20} color="#1E3A8A" />
                  </View>
                  <Text className="text-slate-700 font-semibold text-base">In Settings, select Location</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </View>

            <View>
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-3">Step 2</Text>
              <View className="border border-slate-100 rounded-2xl p-5 flex-row items-center justify-between bg-slate-50">
                <Text className="text-slate-700 font-semibold text-base ml-1">Change access to 'Always'</Text>
                <Check size={20} color="#3B82F6" strokeWidth={3} />
              </View>
            </View>
          </View>

          <View className="flex-1 justify-end pb-8">
            <TouchableOpacity 
              onPress={handleOpenSettings}
              className="bg-blue-900 rounded-2xl p-5 w-full items-center active:bg-blue-800 shadow-xl shadow-blue-900/30"
            >
              <Text className="text-white font-black text-lg">Go to Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
