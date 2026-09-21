import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { FileText, FolderDown } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';

/** Next step after a server-confirmed hospital arrival. */
export function HospitalDocumentationSheet() {
  const { status, activeDispatch, startReport, deferDocumentation } = useResponderStore();

  return (
    <Modal visible={status === 'at_hospital'} transparent animationType="fade" onRequestClose={() => undefined}>
      <View className="flex-1 justify-end bg-black/40 px-4 pb-6">
        <View className="rounded-3xl bg-white p-6 shadow-xl">
          <Text className="text-xs font-black uppercase tracking-widest text-emerald-600">Hospital arrival confirmed</Text>
          <Text className="mt-2 text-xl font-black text-[#1E3A8A]">What would you like to do next?</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            The field response is complete. You may finish the pre-filled documentation now or save it and become available for another emergency.
          </Text>

          <TouchableOpacity
            className="mt-6 flex-row items-center justify-center rounded-2xl bg-[#1E3A8A] py-4"
            onPress={() => void startReport()}
          >
            <FileText color="white" size={18} />
            <Text className="ml-2 text-base font-bold text-white">Proceed to Forms</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="mt-3 flex-row items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 py-4"
            onPress={() => {
              if (!activeDispatch) return;
              void deferDocumentation({
                outcome: 'transported',
                location: activeDispatch.locationName,
              });
            }}
          >
            <FolderDown color="#92400E" size={18} />
            <Text className="ml-2 text-base font-bold text-[#92400E]">Save Draft &amp; Become Available</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
