import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { ShieldCheck, UserCheck, ShieldAlert, Flame, XCircle } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';

const OUTCOMES = [
  { id: 'secured', label: 'Resident Secured', icon: UserCheck, color: '#16A34A', bg: 'bg-green-50' },
  { id: 'police', label: 'Forwarded to Police', icon: ShieldAlert, color: '#1E3A8A', bg: 'bg-blue-50' },
  { id: 'fire', label: 'Forwarded to Fire Dept', icon: Flame, color: '#EA580C', bg: 'bg-orange-50' },
  { id: 'cancelled', label: 'Cancelled (False Alarm)', icon: XCircle, color: '#64748B', bg: 'bg-slate-50' },
];

export function OnSceneSheet() {
  const { status, completeIncident } = useResponderStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%'], []);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'on_scene') {
      bottomSheetRef.current?.expand();
      setSelectedOutcome(null);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [status]);

  if (status !== 'on_scene') return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <View className="flex-1 px-6 pt-2 pb-8">
        
        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <View>
            <View className="flex-row items-center mb-1">
              <View className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2" />
              <Text className="text-slate-800 font-bold text-xl">Status: On-scene</Text>
            </View>
            <Text className="text-slate-500 font-medium">Time Arrived: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center">
            <ShieldCheck color="#16A34A" size={24} />
          </View>
        </View>

        {/* Outcome Selection */}
        <Text className="text-slate-800 font-bold text-lg mb-4">Log Outcome:</Text>
        
        <ScrollView className="flex-1 mb-6" showsVerticalScrollIndicator={false}>
          <View className="space-y-3">
            {OUTCOMES.map((outcome) => {
              const isSelected = selectedOutcome === outcome.id;
              const Icon = outcome.icon;
              
              return (
                <TouchableOpacity
                  key={outcome.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedOutcome(outcome.id)}
                  className={`flex-row items-center p-4 rounded-2xl border-2 transition-colors ${
                    isSelected ? 'border-[#1E3A8A] bg-blue-50' : 'border-slate-100 bg-white'
                  }`}
                >
                  <View className={`w-10 h-10 rounded-full items-center justify-center ${outcome.bg}`}>
                    <Icon color={outcome.color} size={20} />
                  </View>
                  <Text className={`ml-4 font-bold text-base flex-1 ${
                    isSelected ? 'text-[#1E3A8A]' : 'text-slate-700'
                  }`}>
                    {outcome.label}
                  </Text>
                  
                  {/* Radio indicator */}
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? 'border-[#1E3A8A]' : 'border-slate-300'
                  }`}>
                    {isSelected && <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <TouchableOpacity 
          className={`rounded-2xl py-4 items-center shadow-lg ${
            selectedOutcome ? 'bg-[#1E3A8A] shadow-blue-900/20' : 'bg-slate-300 shadow-transparent'
          }`}
          disabled={!selectedOutcome}
          onPress={() => {
            if (selectedOutcome) {
              completeIncident();
            }
          }}
        >
          <Text className={`font-bold text-lg ${selectedOutcome ? 'text-white' : 'text-slate-500'}`}>
            Submit Report
          </Text>
        </TouchableOpacity>

      </View>
    </BottomSheet>
  );
}
