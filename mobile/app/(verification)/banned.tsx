import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ShieldAlert } from 'lucide-react-native';
import { signOutFromMobile } from '../../lib/mobile-auth';

/** Shown to a public user whose mobile account was suspended or deactivated. */
export default function BannedAccountScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutFromMobile();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-background px-6 items-center justify-center">
      <View className="bg-red-50 p-8 rounded-full mb-6">
        <ShieldAlert color="#DC2626" size={76} />
      </View>
      <Text className="text-3xl font-bold text-secondary text-center">Account Banned</Text>
      <Text className="text-dark-grey text-center mt-5 leading-6 px-3">
        Your account has been banned or deactivated and cannot submit reports or use emergency services through the app.
      </Text>
      <Text className="text-dark-grey text-center mt-3 leading-6 px-3">
        Please contact PACC if you believe this was done in error.
      </Text>
      <TouchableOpacity
        onPress={handleSignOut}
        disabled={isSigningOut}
        className="bg-primary mt-12 p-4 w-full rounded-button items-center justify-center min-h-[56px]"
      >
        {isSigningOut ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white font-bold text-lg">Sign Out</Text>}
      </TouchableOpacity>
    </View>
  );
}
