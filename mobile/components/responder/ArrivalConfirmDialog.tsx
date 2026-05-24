import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';

export function ArrivalConfirmDialog() {
  const { isArrivalConfirmVisible, hideArrivalConfirm, arriveAtScene } = useResponderStore();

  return (
    <Modal
      transparent
      visible={isArrivalConfirmVisible}
      animationType="fade"
      onRequestClose={hideArrivalConfirm}
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <View className="bg-white rounded-3xl w-full p-6 shadow-xl">
          
          <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-6 mx-auto">
            <MapPin color="#1E3A8A" size={32} />
          </View>
          
          <Text className="text-xl font-bold text-center text-slate-800 mb-2">
            Confirm Arrival
          </Text>
          
          <Text className="text-slate-500 text-center text-base mb-8">
            Are you sure you have arrived at the incident scene?
          </Text>
          
          <View className="space-y-3">
            <TouchableOpacity 
              className="bg-[#1E3A8A] rounded-2xl py-4 items-center"
              onPress={() => {
                hideArrivalConfirm();
                arriveAtScene();
              }}
            >
              <Text className="text-white font-bold text-lg">Yes, I'm here</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-slate-100 rounded-2xl py-4 items-center"
              onPress={hideArrivalConfirm}
            >
              <Text className="text-slate-600 font-bold text-lg">No, cancel</Text>
            </TouchableOpacity>
          </View>
          
        </View>
      </View>
    </Modal>
  );
}
