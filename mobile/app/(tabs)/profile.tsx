import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { User, LogOut, ChevronRight, Settings, Shield } from 'lucide-react-native';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  const role = user?.publicMetadata?.role?.toString().replace('_', ' ') || 'PUBLIC USER';

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <View className="items-center py-10 bg-surface border-b border-gray-100">
        <View className="bg-primary/10 w-24 h-24 rounded-full items-center justify-center mb-4">
          <User color="#1E3A8A" size={48} />
        </View>
        <Text className="text-2xl font-bold text-primary">{user?.fullName || 'User'}</Text>
        <Text className="text-dark-grey">{user?.emailAddresses[0].emailAddress}</Text>
        <View className="bg-primary/10 px-4 py-1.5 rounded-full mt-3 flex-row items-center">
          <Shield color="#1E3A8A" size={14} />
          <Text className="text-primary text-xs font-bold uppercase ml-1.5">
            {role}
          </Text>
        </View>
      </View>

      <View className="p-6">
        <Text className="text-primary font-bold mb-4 uppercase text-xs tracking-widest">Settings</Text>
        
        <View className="space-y-3">
          <TouchableOpacity className="bg-surface p-4 rounded-card flex-row items-center justify-between border border-gray-100 shadow-sm">
            <View className="flex-row items-center">
              <View className="bg-gray-50 p-2 rounded-lg">
                <Settings color="#4B5563" size={20} />
              </View>
              <Text className="ml-3 text-primary font-bold">Account Settings</Text>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => signOut()}
            className="bg-surface p-4 rounded-card flex-row items-center justify-between border border-secondary/20 shadow-sm mt-4"
          >
            <View className="flex-row items-center">
              <View className="bg-secondary/5 p-2 rounded-lg">
                <LogOut color="#EF4444" size={20} />
              </View>
              <Text className="ml-3 text-secondary font-bold">Sign Out</Text>
            </View>
            <ChevronRight color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>

        <View className="mt-10 items-center">
          <Text className="text-gray-400 text-xs">DisasTRACE v1.0.0</Text>
          <Text className="text-gray-400 text-xs mt-1">Baliwag Incident Response Management</Text>
        </View>
      </View>
    </ScrollView>
  );
}
