import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Hospital } from 'iconsax-react-native';
import * as Haptics from 'expo-haptics';
import { useResponderStore } from '../../stores/useResponderStore';

export function HospitalArrivalConfirmDialog() {
  const { isHospitalArrivalConfirmVisible, hideHospitalArrivalConfirm, arriveAtHospital, targetHospital } = useResponderStore();

  return <Modal transparent visible={isHospitalArrivalConfirmVisible} animationType="fade" onRequestClose={hideHospitalArrivalConfirm}>
    <View className="flex-1 items-center justify-center bg-black/60 px-6">
      <View className="w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-xl">
        <View className="mx-auto mb-5 size-16 items-center justify-center rounded-full bg-blue-50">
          <Hospital size={32} color="#1E3A8A" variant="Bold" />
        </View>
        <Text className="text-center text-xl font-bold text-slate-800">Confirm Hospital Arrival</Text>
        <Text className="mt-2 text-center text-base text-slate-500">
          {`Confirm that you have arrived at ${targetHospital?.name || 'the selected hospital'}.`}
        </Text>
        <Text className="mt-3 text-center text-xs leading-5 text-slate-500">
          GPS can confirm arrival automatically within 15 m only when its accuracy is strong. Use this fallback when GPS cannot confirm it.
        </Text>
        <View className="mt-7 gap-3">
          <TouchableOpacity className="items-center rounded-2xl bg-[#1E3A8A] py-4" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void arriveAtHospital(); }}>
            <Text className="text-lg font-bold text-white">Yes, I&apos;m at the hospital</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center rounded-2xl bg-slate-100 py-4" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); hideHospitalArrivalConfirm(); }}>
            <Text className="text-lg font-bold text-slate-600">Not yet</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>;
}
