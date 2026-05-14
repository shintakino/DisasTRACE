import React from 'react';
import { View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <View className="bg-primary/10 p-10 rounded-full mb-6">
        <Bell color="#1E3A8A" size={60} />
      </View>
      <Text className="text-2xl font-bold text-primary">Notifications</Text>
      <Text className="text-dark-grey text-center mt-4">
        Stay updated with real-time alerts and incident status changes.
      </Text>
    </View>
  );
}
