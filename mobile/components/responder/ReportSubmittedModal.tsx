import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useResponderStore } from '../../stores/useResponderStore';
import { AlertTriangle, FolderCheck } from 'lucide-react-native';

export function ReportSubmittedModal() {
  const { showReportSuccess, activeDispatch, lastSubmittedSummary, lastReportDelivery, finishAndClose } = useResponderStore();

  if (!showReportSuccess) return null;

  return (
    <Modal visible={showReportSuccess} animationType="fade" transparent>
      <View className="flex-1 bg-black/60 items-center justify-center p-6" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View className="bg-white rounded-3xl p-6 items-center shadow-xl w-full" style={{ maxWidth: 360 }}>
          
          <View className={`w-16 h-16 ${lastReportDelivery === 'QUEUED_OFFLINE' ? 'bg-amber-500' : 'bg-[#1E3A8A]'} rounded-2xl items-center justify-center mb-6 mt-4`}>
            {lastReportDelivery === 'QUEUED_OFFLINE' ? <AlertTriangle color="white" size={32} /> : <FolderCheck color="white" size={32} />}
          </View>

          <Text className="text-[#1E3A8A] font-black text-2xl mb-3 text-center">
            {lastReportDelivery === 'QUEUED_OFFLINE' ? 'Saved on this device' : 'Report submitted'}
          </Text>

          <Text className="text-slate-500 text-center text-sm leading-relaxed mb-6 px-2">
            {lastReportDelivery === 'QUEUED_OFFLINE'
              ? `${activeDispatch?.id || 'This report'} has not reached PACC yet. Reconnect and keep the app open; automatic sync is pending.`
              : `${activeDispatch?.id || 'This report'} is closed. The server confirmed resolution, and the report is now available to CDRRMO and PACC.`}
          </Text>

          <View className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8">
            <Text className="text-center text-slate-400 font-bold text-[10px] tracking-widest uppercase mb-4">
              TRIP SUMMARY
            </Text>
            
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text className="text-[#1E3A8A] font-bold text-xl mb-1.5" numberOfLines={1}>
                  {lastSubmittedSummary?.responseTimeStr || '9m'}
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
                  {lastSubmittedSummary !== null && lastSubmittedSummary !== undefined
                    ? lastSubmittedSummary.distanceKm.toFixed(1)
                    : '1.7'}
                </Text>
                <Text className="text-slate-400 font-bold text-[8px] tracking-widest uppercase">KM</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            className="w-full bg-[#1E3A8A] rounded-2xl py-4 items-center mb-2"
            onPress={lastReportDelivery === 'QUEUED_OFFLINE'
              ? () => useResponderStore.setState({ showReportSuccess: false })
              : finishAndClose}
          >
            <Text className="text-white font-bold text-lg">{lastReportDelivery === 'QUEUED_OFFLINE' ? 'Keep report open' : 'Back to dashboard'}</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </Modal>
  );
}
