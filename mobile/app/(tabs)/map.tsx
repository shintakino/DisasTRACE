import React from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';

export default function MapScreen() {
  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <View className="bg-primary/10 p-10 rounded-full mb-6">
        <MapPin color="#1E3A8A" size={60} />
      </View>
      <Text className="text-2xl font-bold text-primary">Interactive Map</Text>
      <Text className="text-dark-grey text-center mt-4">
        Real-time view of nearby hospitals and incident locations will appear here.
      </Text>
    </View>
  );
}
