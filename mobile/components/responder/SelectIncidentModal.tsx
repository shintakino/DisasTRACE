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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIncidents([]);
        return;
      }

      const userId = session.user.id;

      // 1. Fetch all resolved incidents assigned to this responder
      const { data: unresolvedIncidents, error: incError } = await supabase
        .from('incidents')
        .select('id, status, created_at, assigned_ambulance, request_id')
        .eq('responder_id', userId)
        .eq('status', 'RESOLVED');

      if (incError) throw incError;

      if (!unresolvedIncidents || unresolvedIncidents.length === 0) {
        setIncidents([]);
        return;
      }

      // 2. Fetch all submitted reports by this responder
      const { data: dbReports, error: repError } = await supabase
        .from('reports')
        .select('incident_id')
        .eq('responder_id', userId);

      if (repError) throw repError;

      const reportedIncidentIds = dbReports ? dbReports.map((r: any) => r.incident_id) : [];

      // Filter out incidents that already have a submitted report or are marked as locally submitted
      const unreported = unresolvedIncidents.filter(
        (inc: any) => !reportedIncidentIds.includes(inc.id) && !submittedIncidentIds.includes(inc.id)
      );

      if (unreported.length === 0) {
        setIncidents([]);
        return;
      }

      // 3. Fetch verification request details for context pre-fills
      const requestIds = unreported.map(inc => inc.request_id).filter(Boolean);
      let requests: any[] = [];
      
      if (requestIds.length > 0) {
        const { data: reqData, error: reqError } = await supabase
          .from('verification_requests')
          .select('*')
          .in('id', requestIds);
        
        if (reqError) throw reqError;
        requests = reqData || [];
      }

      // 4. Map into high-fidelity DispatchDetails contract
      const unsubmitted = unreported.map((inc: any) => {
        const vReq = requests.find((r: any) => r.id === inc.request_id);
        const peopleInvolvedStr = vReq?.people_involved || '1-2 Persons';
        const matched = peopleInvolvedStr.match(/\d+/);
        const peopleInvolvedCount = matched ? parseInt(matched[0], 10) : 1;

        return {
          id: inc.id,
          type: vReq?.type || 'Emergency Response',
          locationName: vReq?.location_description || vReq?.address || 'Baliwag City',
          distance: '1.2 km',
          natureOfCall: vReq?.nature || 'Emergency',
          peopleInvolved: peopleInvolvedCount,
          eta: 'Completed',
          reporterName: 'Resident',
          reporterInitials: 'R',
          timestamp: new Date(inc.created_at).toLocaleTimeString("en-US", {
            hour: '2-digit',
            minute: '2-digit'
          }),
          coordinates: { 
            latitude: vReq?.latitude ? Number(vReq.latitude) : 14.9516, 
            longitude: vReq?.longitude ? Number(vReq.longitude) : 120.9011 
          },
          typeOfEmergency: vReq?.type || 'Medical Emergency',
          assignedAmbulance: inc.assigned_ambulance || 'AMB-001'
        };
      });

      setIncidents(unsubmitted);
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
