import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, Monitor } from 'lucide-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';

export default function UnauthorizedPlatformScreen() {
  const router = useRouter();
  const { isLoaded, role, verificationStatus } = useAuthStatus();
  const isWebOnlyRole = role === 'cdrrmo_super_admin' || role === 'pacc_admin';

  // This screen must never become a sign-out trap for an approved mobile
  // account during an auth/verification refresh race or a manual deep link.
  useEffect(() => {
    if (isLoaded && verificationStatus === 'approved' && !isWebOnlyRole) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isWebOnlyRole, router, verificationStatus]);

  if (!isWebOnlyRole) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <View className="bg-secondary/10 p-8 rounded-full mb-6">
        <Monitor color="#EF4444" size={80} />
      </View>
      
      <Text className="text-3xl font-bold text-secondary text-center">
        Web Access Only
      </Text>
      
      <Text className="text-dark-grey text-center mt-4 text-lg">
        Admin accounts are restricted to the DisasTRACE Web Dashboard. Please use your computer to access management features.
      </Text>

      <View className="bg-surface p-6 rounded-card mt-10 w-full border border-secondary/20 shadow-sm">
        <View className="flex-row items-center mb-4">
          <ShieldAlert color="#EF4444" size={24} />
          <Text className="text-secondary font-bold ml-2 text-lg">Platform Restriction</Text>
        </View>
        <Text className="text-dark-grey leading-6">
          Your role (Admin/Dispatcher) requires a desktop browser for full operational capabilities, including map management and report auditing.
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        className="mt-12 p-4 w-full bg-primary rounded-button items-center"
      >
        <Text className="text-white font-bold text-lg">Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}
