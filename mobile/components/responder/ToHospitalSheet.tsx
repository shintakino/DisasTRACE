import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Info } from 'lucide-react-native';
import { Hospital } from 'iconsax-react-native';
import { useResponderStore } from '../../stores/useResponderStore';

export function ToHospitalSheet() {
  const { status, elapsedTimeSeconds, targetHospital, startReport } = useResponderStore();
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (status === 'to_hospital') {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={status === 'to_hospital' ? 0 : -1}
      enableDynamicSizing={true}
      enablePanDownToClose={false}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <BottomSheetView className="px-6 pt-2 pb-12">
        {/* Hospital Header */}
        <View className="flex-row items-center mb-6">
          <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center border border-blue-100">
            <Hospital size={24} color="#1E3A8A" variant="Bold" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-slate-800 font-bold text-base">
              {targetHospital ? targetHospital.name : 'Finding hospital...'}
            </Text>
            <Text className="text-slate-500 text-xs mt-0.5">via Fastest Route</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-[#1E3A8A] font-bold text-xl">11 min</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">ETA</Text>
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 items-center justify-center">
            <Text className="text-[#1E3A8A] font-bold text-xl">{formatTime(elapsedTimeSeconds)}</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">ELAPSED</Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-[#1E3A8A] font-bold text-xl">3.2 km</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">DISTANCE</Text>
          </View>
        </View>

        <View className="bg-blue-50 flex-row items-center p-4 rounded-xl mb-6 border border-blue-100">
          <View className="w-6 h-6 bg-blue-200 rounded-full items-center justify-center mr-3">
            <Info size={14} color="#1E3A8A" />
          </View>
          <Text className="text-[#1E3A8A] text-xs font-medium flex-1">
            The form will be pre-filled from the resident's report. You can edit any field.
          </Text>
        </View>

        {/* Arrived Button */}
        <TouchableOpacity 
          className="bg-[#1E3A8A] rounded-2xl py-4 items-center shadow-lg shadow-blue-900/20 active:bg-blue-900"
          onPress={() => {
            // For now, arriving at hospital just opens the report form.
            startReport();
          }}
        >
          <Text className="text-white font-bold text-lg">Arrived at Hospital</Text>
        </TouchableOpacity>

      </BottomSheetView>
    </BottomSheet>
  );
}
