import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStatus } from '../hooks/use-auth-status';
import "../global.css";

// Ignore known React Native third-party warnings
LogBox.ignoreLogs([
  '`new NativeEventEmitter()` was called with a non-null argument without the required `addListener` method.',
  '`new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method.',
]);

// Prevent the native splash screen from auto-hiding.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isLoaded, isSignedIn, verificationStatus } = useAuthStatus();
  const segments = useSegments();
  const router = useRouter();
  const [isAppReady, setIsAppReady] = useState(false);

  console.log('[InitialLayout] Rendered. isLoaded:', isLoaded, 'isSignedIn:', isSignedIn, 'verificationStatus:', verificationStatus);

  // Mark app as ready once Auth has initialized
  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
      setIsAppReady(true);
    }
  }, [isLoaded]);

  // Handle routing ONLY after Auth is ready
  useEffect(() => {
    if (!isAppReady) return;

    // Segment routing evaluation
    const rawSegments = segments as string[];
    const inAuthGroup = rawSegments[0] === '(auth)';
    const inVerificationGroup = rawSegments[0] === '(verification)';
    const atRoot = rawSegments.length === 0 || (rawSegments.length === 1 && rawSegments[0] === '');
    const isResetPassword = inAuthGroup && rawSegments[1] === 'reset-password';

    // Allow the EntryScreen in app/index.tsx to handle the splash sequence
    // and route the user when the animation finishes.
    if (atRoot) return;

    if (isResetPassword) return;

    if (!isSignedIn) {
      // Not signed in: allow root (for role selection), redirect otherwise
      if (!inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    } else {
      // Signed in: route based on verification status
      if (verificationStatus === 'pending') {
        if (!inVerificationGroup || rawSegments[1] !== 'pending') {
          router.replace('/(verification)/pending');
        }
      } else if (verificationStatus === 'rejected') {
        if (!inVerificationGroup || rawSegments[1] !== 'rejected') {
          router.replace('/(verification)/rejected');
        }
      } else if (verificationStatus === 'unauthorized_platform') {
        if (!inVerificationGroup || rawSegments[1] !== 'unauthorized') {
          router.replace('/(verification)/unauthorized');
        }
      } else if (verificationStatus === 'approved') {
        // Only redirect approved users to tabs if they are trapped in auth or verification flows.
        if (inAuthGroup || inVerificationGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [isSignedIn, isAppReady, verificationStatus, segments]);

  if (!isAppReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(verification)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <InitialLayout />
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
