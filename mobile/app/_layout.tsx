import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import tokenCache from '../lib/token-cache';
import { useAuthStatus } from '../hooks/use-auth-status';
import "../global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
}

function InitialLayout() {
  const { isLoaded, isSignedIn, verificationStatus } = useAuthStatus();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === 'sign-in' || segments[0] === 'sign-up';
    const inVerificationGroup = segments[0] === 'pending' || segments[0] === 'rejected';

    if (!isSignedIn) {
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else {
      // User is signed in
      if (verificationStatus === 'pending') {
        if (segments[0] !== 'pending') {
          router.replace('/(verification)/pending');
        }
      } else if (verificationStatus === 'rejected') {
        if (segments[0] !== 'rejected') {
          router.replace('/(verification)/rejected');
        }
      } else if (verificationStatus === 'unauthorized_platform') {
        if (segments[0] !== 'unauthorized') {
          router.replace('/(verification)/unauthorized');
        }
      } else if (verificationStatus === 'approved') {
        if (inAuthGroup || inVerificationGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [isSignedIn, isLoaded, verificationStatus, segments]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(verification)" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <InitialLayout />
        <StatusBar style="auto" />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
