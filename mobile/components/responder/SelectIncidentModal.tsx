import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { CalendarTick, Location } from 'iconsax-react-native';
import { X } from 'lucide-react-native';
import { useResponderStore, DispatchDetails } from '../../stores/useResponderStore';
import { supabase } from '../../lib/supabase';

interface SelectIncidentModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SelectIncidentModal({ visible, onClose }: SelectIncidentModalProps) {
  const { submittedIncidentIds, openFormForIncident } = useResponderStore();
  const [incidents, setIncidents] = useState<DispatchDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();
      const reqHeaders: any = {};
      if (session?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiUrl}/api/reports`, {
        headers: reqHeaders,
      });
      const result = await response.json();
      
      if (result.data) {
        const unsubmitted = result.data
          .filter((r: any) => r.status !== 'SUBMITTED' && !submittedIncidentIds.includes(r.id))
          .map((r: any) => ({
            id: r.id,
            type: r.type || 'Emergency Response',
            locationName: r.location || 'Baliwag City',
            distance: '1.2 km',
            natureOfCall: 'Emergency',
            peopleInvolved: 1,
            eta: 'Completed',
            reporterName: r.responderName || 'CDRRMO Officer',
            reporterInitials: 'CO',
            timestamp: r.time || 'Just now',
            coordinates: { latitude: 14.9516, longitude: 120.9011 },
            typeOfEmergency: r.type
          }));
        setIncidents(unsubmitted);
      }
    } catch (e) {
      console.error('Error fetching select incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchIncidents();
    }
  }, [visible]);

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

          {loading ? (
            <View className="py-20 justify-center items-center">
              <ActivityIndicator size="large" color="#1E3A8A" />
            </View>
          ) : (
            <ScrollView className="max-h-[80%]">
              {incidents.length === 0 ? (
                <View className="py-10 items-center">
                  <Text className="text-slate-400 font-medium">No pending incidents to report.</Text>
                </View>
              ) : (
                incidents.map((incident) => (
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
          )}
        </View>
      </View>
    </Modal>
  );
}
