import React from 'react';
import { View, Text } from 'react-native';
import { ClipboardList } from 'lucide-react-native';

export default function ReportsScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <View className="bg-blue-50 p-10 rounded-full mb-6">
        <ClipboardList color="#1E3A8A" size={60} />
      </View>
      <Text className="text-2xl font-bold text-[#1E3A8A]">Incident Reports</Text>
      <Text className="text-slate-500 text-center mt-4 px-10">
        You haven't filed any incident reports yet.
      </Text>
    </View>
  );
}
