import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Add, FolderOpen } from 'iconsax-react-native';
import { useResponderStore } from '../../stores/useResponderStore';
import { SelectIncidentModal } from '../../components/responder/SelectIncidentModal';
import { IncidentReportForm } from '../../components/responder/IncidentReportForm';

export default function FormsScreen() {
  const { drafts, openFormForIncident } = useResponderStore();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header Background */}
      <View className="absolute top-0 left-0 right-0 h-48 bg-[#1E3A8A]">
        <View className="absolute inset-0 opacity-20">
          {/* We would put a map image or grid pattern here, using a simple view for now */}
          <View className="flex-1 border-white/20 border-b border-l border-r border-t m-4 rounded-xl" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <Text className="text-white text-3xl font-black mb-8 mt-4">Forms</Text>

        <TouchableOpacity 
          onPress={() => setModalVisible(true)}
          className="bg-blue-500 rounded-3xl p-6 flex-row items-center shadow-lg shadow-blue-500/30 mb-8"
        >
          <View className="bg-white/20 rounded-2xl p-3 mr-4">
            <Add size={32} color="white" />
          </View>
          <View>
            <Text className="text-white font-bold text-xl mb-1">+ New Form</Text>
            <Text className="text-blue-100 text-sm">Create a new incident report</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row items-center justify-between mb-4 mt-2">
          <Text className="text-slate-800 font-bold text-lg">Drafts</Text>
          <View className="bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-[#1E3A8A] font-bold text-xs">{drafts.length}</Text>
          </View>
        </View>

        {drafts.length === 0 ? (
          <View className="py-10 items-center">
            <FolderOpen size={48} color="#CBD5E1" variant="Bulk" />
            <Text className="text-slate-400 font-medium mt-4">No drafts found.</Text>
          </View>
        ) : (
          drafts.map((draft) => (
            <TouchableOpacity 
              key={draft.id}
              // Here we mock creating a DispatchDetails object out of the draft.
              // In reality, we'd lookup the incident by incidentId.
              onPress={() => openFormForIncident({
                id: draft.incidentId,
                type: draft.incidentType,
                locationName: 'Draft Location',
                distance: '',
                natureOfCall: 'Emergency',
                peopleInvolved: 1,
                eta: '',
                reporterName: '',
                reporterInitials: '',
                timestamp: '',
                coordinates: { latitude: 0, longitude: 0 },
                typeOfEmergency: draft.incidentType
              })}
              className="bg-[#FEFCE8] border border-[#FEF08A] rounded-2xl p-5 mb-4 shadow-sm"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className="w-8 h-8 bg-yellow-100 rounded-full items-center justify-center mr-3">
                      <FolderOpen size={16} color="#B45309" variant="Bold" />
                    </View>
                    <Text className="text-[#713F12] font-bold text-base flex-1">
                      Incident Form - {draft.incidentType}
                    </Text>
                  </View>
                  <Text className="text-[#A16207] text-xs font-medium ml-11 mb-4">
                    {draft.incidentId} • {draft.id}
                  </Text>
                </View>
                <View className="bg-yellow-100 px-2 py-1 rounded border border-yellow-200">
                  <Text className="text-[#92400E] font-black text-[10px] uppercase tracking-widest">
                    Draft
                  </Text>
                </View>
              </View>

              <View className="border-t border-[#FEF08A] pt-3 flex-row items-center justify-between">
                <Text className="text-[#A16207] text-xs font-medium">
                  {draft.lastSaved}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <SelectIncidentModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
      <IncidentReportForm />
    </SafeAreaView>
  );
}
