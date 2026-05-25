import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { CalendarTick, Location } from 'iconsax-react-native';
import { X } from 'lucide-react-native';
import { useResponderStore, DispatchDetails } from '../../stores/useResponderStore';

// We need some mock completed incidents that haven't been submitted
const mockCompletedIncidents: DispatchDetails[] = [
  {
    id: 'DR-2026-0848',
    type: 'Vehicular Collision',
    locationName: 'MacArthur Highway, Malolos',
    distance: '3.2 km',
    natureOfCall: 'Emergency',
    peopleInvolved: 2,
    eta: 'Completed',
    reporterName: 'Juan Dela Cruz',
    reporterInitials: 'JD',
    timestamp: '10:15 AM',
    coordinates: { latitude: 14.8433, longitude: 120.8114 },
    typeOfEmergency: 'Vehicular Collision'
  },
  {
    id: 'DR-2026-0850',
    type: 'Medical Emergency',
    locationName: 'Poblacion, Plaridel',
    distance: '1.5 km',
    natureOfCall: 'Emergency',
    peopleInvolved: 1,
    eta: 'Completed',
    reporterName: 'Maria Clara',
    reporterInitials: 'MC',
    timestamp: '02:30 PM',
    coordinates: { latitude: 14.8870, longitude: 120.8583 },
    typeOfEmergency: 'Medical'
  }
];

interface SelectIncidentModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SelectIncidentModal({ visible, onClose }: SelectIncidentModalProps) {
  const { submittedIncidentIds, openFormForIncident } = useResponderStore();

  const availableIncidents = mockCompletedIncidents.filter(
    (inc) => !submittedIncidentIds.includes(inc.id)
  );

  const handleSelect = (incident: DispatchDetails) => {
    openFormForIncident(incident);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl pt-6 pb-10 px-4 min-h-[50%]">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-[#1E3A8A]">Select Incident</Text>
            <TouchableOpacity onPress={onClose} className="bg-slate-100 p-2 rounded-full">
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text className="text-slate-500 mb-4">
            Select an unsubmitted incident below to start creating a report form.
          </Text>

          <ScrollView className="max-h-[80%]">
            {availableIncidents.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-slate-400 font-medium">No pending incidents to report.</Text>
              </View>
            ) : (
              availableIncidents.map((incident) => (
                <TouchableOpacity
                  key={incident.id}
                  onPress={() => handleSelect(incident)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-3 flex-row items-center"
                >
                  <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                    <CalendarTick size={24} color="#1E3A8A" variant="Bold" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#1E3A8A] font-bold text-base mb-1">
                      {incident.type}
                    </Text>
                    <Text className="text-slate-500 text-sm font-medium mb-1">
                      {incident.id} • {incident.timestamp}
                    </Text>
                    <View className="flex-row items-center">
                      <Location size={14} color="#64748B" variant="Bold" />
                      <Text className="text-slate-500 text-xs ml-1" numberOfLines={1}>
                        {incident.locationName}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
