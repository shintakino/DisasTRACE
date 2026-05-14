import React from 'react';
import { View, Text } from 'react-native';
import { ClipboardList } from 'lucide-react-native';

export default function LogsScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <View className="bg-primary/10 p-10 rounded-full mb-6">
        <ClipboardList color="#1E3A8A" size={60} />
      </View>
      <Text className="text-2xl font-bold text-primary">Activity Logs</Text>
      <Text className="text-dark-grey text-center mt-4">
        Your dispatch history and status updates will be listed here.
      </Text>
    </View>
  );
}
