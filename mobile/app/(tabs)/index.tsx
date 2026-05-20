import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { Megaphone, Shield, AlertTriangle } from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuthStatus();
  const role = (user?.app_metadata?.role as string) || 'public_user';

  if (role === 'ambulance_responder') {
    return (
      <View className="flex-1 bg-background p-6">
        <View className="bg-primary p-6 rounded-card shadow-sm">
          <Text className="text-white text-lg">Duty Status</Text>
          <Text className="text-white text-3xl font-bold mt-2">OFF DUTY</Text>
          <TouchableOpacity className="bg-white mt-4 p-3 rounded-button items-center">
            <Text className="text-primary font-bold">GO ON DUTY</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8">
          <Text className="text-xl font-bold text-primary mb-4">Active Dispatch</Text>
          <View className="bg-surface p-8 rounded-card border border-gray-100 items-center justify-center">
            <Shield color="#9CA3AF" size={48} />
            <Text className="text-dark-grey mt-4">No active dispatches</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background p-6" showsVerticalScrollIndicator={false}>
      <Text className="text-2xl font-bold text-primary mb-6">How can we help?</Text>
      
      <View className="flex-row flex-wrap justify-between">
        <TouchableOpacity className="bg-surface p-6 rounded-card w-[48%] border border-gray-100 shadow-sm items-center">
          <View className="bg-secondary/10 p-4 rounded-full mb-4">
            <Megaphone color="#EF4444" size={32} />
          </View>
          <Text className="text-primary font-bold text-center">Report Incident</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-surface p-6 rounded-card w-[48%] border border-gray-100 shadow-sm items-center">
          <View className="bg-info/10 p-4 rounded-full mb-4">
            <AlertTriangle color="#3B82F6" size={32} />
          </View>
          <Text className="text-primary font-bold text-center">Safety Tips</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-10">
        <Text className="text-xl font-bold text-primary mb-4">Recent Reports</Text>
        <View className="bg-surface p-8 rounded-card border border-gray-100 items-center justify-center">
          <Text className="text-dark-grey">You haven't reported any incidents yet.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
