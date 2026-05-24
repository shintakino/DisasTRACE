import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { MapPin } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';

export function DispatchSheet() {
  const { status, activeDispatch, acceptDispatch, completeIncident } = useResponderStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);
  const progress = useSharedValue(100);

  useEffect(() => {
    if (status === 'dispatch_offered') {
      bottomSheetRef.current?.expand();
      progress.value = 100;
      // Animate countdown (e.g., 5 seconds)
      progress.value = withTiming(0, { duration: 5000, easing: Easing.linear }, (finished) => {
        if (finished) {
          runOnJS(handleTimeout)();
        }
      });
    } else {
      bottomSheetRef.current?.close();
      progress.value = 100; // reset
    }
  }, [status]);

  const handleTimeout = () => {
    // If time runs out, auto-dismiss (mock)
    if (useResponderStore.getState().status === 'dispatch_offered') {
      completeIncident();
    }
  };

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
    };
  });

  if (!activeDispatch) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <View className="flex-1 px-6 pt-2 pb-8">
        
        {/* Countdown Banner */}
        <View className="bg-slate-100 rounded-2xl p-4 mb-6 relative overflow-hidden flex-row items-center justify-center">
          <Animated.View className="absolute top-0 bottom-0 left-0 bg-blue-100/50" style={progressStyle} />
          <View className="items-center">
            <Text className="text-[#1E3A8A] font-bold text-sm mb-1">Respond within 5 seconds</Text>
            <Text className="text-slate-500 text-xs">Auto-dismissed passed to next available unit</Text>
          </View>
        </View>

        {/* Incident Details */}
        <Text className="text-2xl font-bold text-slate-800 mb-2">{activeDispatch.type}</Text>
        <View className="flex-row items-center mb-6">
          <MapPin size={14} color="#64748B" />
          <Text className="text-slate-500 text-xs ml-1 font-medium">{activeDispatch.locationName} · {activeDispatch.distance}</Text>
        </View>

        {/* Metrics Grid */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-red-700 font-bold text-sm uppercase">{activeDispatch.natureOfCall}</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">NATURE OF CALL</Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-slate-700 font-bold text-lg">{activeDispatch.peopleInvolved}</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-0.5 uppercase tracking-widest">PERSONS</Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-[#1E3A8A] font-bold text-lg">{activeDispatch.eta}</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-0.5 uppercase tracking-widest">ETA</Text>
          </View>
        </View>

        {/* Reporter Info */}
        <View className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1E3A8A] items-center justify-center">
              <Text className="text-white font-bold">{activeDispatch.reporterInitials}</Text>
            </View>
            <View className="ml-3">
              <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch.reporterName}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">{activeDispatch.id} · Live photo attached</Text>
            </View>
          </View>
          <Text className="text-slate-400 text-xs font-medium">{activeDispatch.timestamp}</Text>
        </View>

        {/* Accept Button */}
        <TouchableOpacity 
          className="bg-[#B91C1C] rounded-2xl py-4 items-center shadow-lg shadow-red-900/20 active:bg-red-800"
          onPress={() => {
            progress.value = 100; // Cancel animation
            acceptDispatch();
          }}
        >
          <Text className="text-white font-bold text-lg">Accept Dispatch</Text>
        </TouchableOpacity>

      </View>
    </BottomSheet>
  );
}
