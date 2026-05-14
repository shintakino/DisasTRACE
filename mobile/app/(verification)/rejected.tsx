import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@clerk/expo';
import { XCircle, AlertCircle } from 'lucide-react-native';

export default function RejectedVerificationScreen() {
  const { signOut } = useAuth();
  // In a real app, we'd fetch the rejection reason from the API
  const rejectionReason = "Incomplete identity documents. Please ensure the photo is clear and all details are visible.";

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <View className="bg-secondary/10 p-8 rounded-full mb-6">
        <XCircle color="#EF4444" size={80} />
      </View>
      
      <Text className="text-3xl font-bold text-secondary text-center">
        Registration Rejected
      </Text>
      
      <View className="bg-surface p-6 rounded-card mt-8 w-full border border-secondary/20 shadow-sm">
        <View className="flex-row items-center mb-4">
          <AlertCircle color="#EF4444" size={24} />
          <Text className="text-secondary font-bold ml-2 text-lg">Reason for Rejection</Text>
        </View>
        <Text className="text-dark-grey leading-6 italic">
          "{rejectionReason}"
        </Text>
      </View>

      <Text className="text-dark-grey text-center mt-8 px-4">
        You can re-submit your registration with the correct documents through our web portal or contact support.
      </Text>

      <TouchableOpacity
        className="bg-primary mt-12 p-4 w-full rounded-button items-center"
      >
        <Text className="text-white font-bold text-lg">Re-submit Documents</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => signOut()}
        className="mt-4 p-4 w-full border border-gray-300 rounded-button items-center"
      >
        <Text className="text-dark-grey font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
