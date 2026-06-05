import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Activity, Truck, ThumbsDown, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useResponderStore } from '../../stores/useResponderStore';

const OUTCOMES = [
  { 
    id: 'handled', 
    label: 'Handled on Scene', 
    desc: 'Paramedics treated patient — no transport needed', 
    icon: Activity, 
    color: '#B91C1C', 
    bg: 'bg-red-100' 
  },
  { 
    id: 'transport', 
    label: 'Transport to Hospital', 
    desc: 'Patient will be brought to the nearest hospital', 
    icon: Truck, 
    color: '#B91C1C', 
    bg: 'bg-red-100' 
  },
  { 
    id: 'refused', 
    label: 'Patient Refused / Other', 
    desc: 'Patient declined treatment or transport', 
    icon: ThumbsDown, 
    color: '#B91C1C', 
    bg: 'bg-red-100' 
  },
];

export function OnSceneSheet() {
  const { status, completeIncident, sceneTimeSeconds } = useResponderStore();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'on_scene') {
      setSelectedOutcome(null);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [status]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonText = () => {
    if (selectedOutcome === 'handled') return 'End Sharing';
    if (selectedOutcome === 'transport') return 'Transport to Hospital';
    if (selectedOutcome === 'refused') return 'End Sharing';
    return 'End Sharing'; // default
  };

  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={status === 'on_scene' ? 1 : -1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={false}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <BottomSheetScrollView className="px-6 pt-2 pb-12">
        
        <View className="flex-row items-center mb-4">
          <View className="bg-red-200 px-3 py-1.5 rounded-full">
            <Text className="text-red-900 text-[10px] font-black uppercase tracking-widest">ARRIVED AT SCENE</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between bg-blue-100 rounded-xl px-5 py-4 mb-6">
          <Text className="text-[#1E3A8A] font-bold text-sm">Scene Time</Text>
          <Text className="text-[#1E3A8A] font-black text-2xl">{formatTime(sceneTimeSeconds)}</Text>
        </View>

        <Text className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-4">WHAT IS THE OUTCOME?</Text>
        
        <View className="mb-6">
          <View className="space-y-3">
            {OUTCOMES.map((outcome) => {
              const isSelected = selectedOutcome === outcome.id;
              const Icon = outcome.icon;
              
              return (
                <TouchableOpacity
                  key={outcome.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedOutcome(outcome.id);
                  }}
                  className={`flex-row items-center p-4 rounded-2xl border ${
                    isSelected ? 'border-[#1E3A8A]' : 'border-slate-100 bg-white'
                  }`}
                >
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${outcome.bg}`}>
                    <Icon color={outcome.color} size={24} />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className={`font-bold text-base ${isSelected ? 'text-[#1E3A8A]' : 'text-slate-800'}`}>
                      {outcome.label}
                    </Text>
                    <Text className="text-slate-500 text-xs mt-0.5 leading-tight">
                      {outcome.desc}
                    </Text>
                  </View>
                  
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ml-2 ${
                    isSelected ? 'border-[#1E3A8A]' : 'border-slate-300'
                  }`}>
                    {isSelected && <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="bg-blue-50 flex-row items-center p-4 rounded-xl mt-4 border border-blue-100">
            <View className="w-6 h-6 bg-blue-200 rounded-full items-center justify-center mr-3">
              <Info size={14} color="#1E3A8A" />
            </View>
            <Text className="text-[#1E3A8A] text-xs font-medium flex-1">
              The form will be pre-filled from the resident's report. You can edit any field.
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          className={`rounded-2xl py-4 items-center shadow-lg ${
            selectedOutcome ? 'bg-[#1E3A8A] shadow-blue-900/20' : 'bg-slate-300 shadow-transparent'
          }`}
          disabled={!selectedOutcome}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (selectedOutcome === 'transport') {
              bottomSheetRef.current?.close();
              setTimeout(() => {
                useResponderStore.getState().transportToHospital();
              }, 300);
            } else if (selectedOutcome) {
              bottomSheetRef.current?.close();
              setTimeout(() => {
                useResponderStore.getState().startReport();
              }, 300);
            }
          }}
        >
          <Text className={`font-bold text-lg ${selectedOutcome ? 'text-white' : 'text-slate-500'}`}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>

      </BottomSheetScrollView>
    </BottomSheet>
  );
}
