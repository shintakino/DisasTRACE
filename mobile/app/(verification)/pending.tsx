import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Clock, ShieldAlert } from 'lucide-react-native';

export default function PendingVerificationScreen() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <View className="bg-warning/10 p-8 rounded-full mb-6">
        <Clock color="#F97316" size={80} />
      </View>
      
      <Text className="text-3xl font-bold text-primary text-center">
        Verification Pending
      </Text>
      
      <Text className="text-dark-grey text-center mt-4 text-lg">
        Your account is currently being reviewed by the PACC Admin. This process typically takes 24-48 hours.
      </Text>

      <View className="bg-surface p-6 rounded-card mt-10 w-full border border-gray-100 shadow-sm">
        <View className="flex-row items-center mb-4">
          <ShieldAlert color="#F97316" size={24} />
          <Text className="text-primary font-bold ml-2 text-lg">What happens next?</Text>
        </View>
        <Text className="text-dark-grey leading-6">
          1. Admin reviews your identity documents.{"\n"}
          2. You'll receive a notification once approved.{"\n"}
          3. You can then access the full features of DisasTRACE.
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        className="mt-12 p-4 w-full border border-primary rounded-button items-center"
      >
        <Text className="text-primary font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
