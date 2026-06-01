import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useResponderStore } from '../../stores/useResponderStore';
import { FolderCheck } from 'lucide-react-native';

export function ReportSubmittedModal() {
  const { showReportSuccess, activeDispatch, lastSubmittedSummary, finishAndClose } = useResponderStore();

  if (!showReportSuccess) return null;

  return (
    <Modal visible={showReportSuccess} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        <View className="bg-white rounded-3xl w-full p-6 items-center shadow-xl">
          
          <View className="w-16 h-16 bg-[#1E3A8A] rounded-2xl items-center justify-center mb-6 mt-4">
            <FolderCheck color="white" size={32} />
          </View>

          <Text className="text-[#1E3A8A] font-black text-2xl mb-3 text-center">
            Report Submitted
          </Text>

          <Text className="text-slate-500 text-center text-sm leading-relaxed mb-6 px-2">
            {activeDispatch?.id || 'DR-2026-0847'} is closed. Report saved and synced. CDRRMO and PACC notified. Status back to Standby.
          </Text>

          <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
            <Text className="text-center text-slate-400 font-bold text-[10px] tracking-widest uppercase mb-4">
              TRIP SUMMARY
            </Text>
            
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-[#1E3A8A] font-bold text-2xl mb-1">
                  {lastSubmittedSummary?.responseTimeMins || 9}m
                </Text>
                <Text className="text-slate-400 font-bold text-[8px] tracking-widest uppercase">RESPONSE</Text>
              </View>
              
              <View className="items-center flex-1 border-x border-slate-200">
                <Text className="text-[#1E3A8A] font-bold text-2xl mb-1">
                  {lastSubmittedSummary?.patientsCount || 1}
                </Text>
                <Text className="text-slate-400 font-bold text-[8px] tracking-widest uppercase">PATIENTS</Text>
              </View>
              
              <View className="items-center flex-1">
                <Text className="text-[#1E3A8A] font-bold text-2xl mb-1">
                  {lastSubmittedSummary?.distanceKm?.toFixed(1) || 1.7}
                </Text>
                <Text className="text-slate-400 font-bold text-[8px] tracking-widest uppercase">KM</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="w-full bg-[#1E3A8A] rounded-2xl py-4 items-center mb-2"
            onPress={finishAndClose}
          >
            <Text className="text-white font-bold text-lg">Back To Dashboard</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </Modal>
  );
}
