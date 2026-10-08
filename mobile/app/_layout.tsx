import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { LogBox, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStatus } from '../hooks/use-auth-status';
import { registerResponderPushNotifications, subscribeToPushTokenChanges } from '../lib/push-notifications';
import { resolveResponderNotificationRoute } from '../lib/responder-notification-route';
import { resolvePublicNotificationRoute } from '../lib/public-notification-route';
import { useEmergencyReportStore } from '../store/use-emergency-report-store';
import { useResponderStore } from '../stores/useResponderStore';
import "../global.css";

// Ignore known React Native third-party warnings
LogBox.ignoreLogs([
  '`new NativeEventEmitter()` was called with a non-null argument without the required `addListener` method.',
  '`new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method.',
]);

// Keep placeholder text readable in every light form field, including the
// responder intake modals. Individual screens can still override this value.
const TextInputWithDefaults = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };
TextInputWithDefaults.defaultProps = {
  ...TextInputWithDefaults.defaultProps,
  placeholderTextColor: '#64748B',
};

// Prevent the native splash screen from auto-hiding.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isLoaded, isSignedIn, verificationStatus, role, user } = useAuthStatus();
  const loadOfflineQueue = useResponderStore((state) => state.loadOfflineQueue);
  const segments = useSegments();
  const router = useRouter();
  const [isAppReady, setIsAppReady] = useState(false);
  const [notificationResponseVersion, setNotificationResponseVersion] = useState(0);
  const pendingNotificationResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const handledNotificationResponseIdsRef = useRef(new Set<string>());
  const queuedNotificationResponseIdsRef = useRef(new Set<string>());

  // Preserve notification taps until auth and the root navigator are ready.
  // Android must never fall back to a bare `disastrace:///` URI for a responder alert.
  useEffect(() => {
    const queueNotificationResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      if (handledNotificationResponseIdsRef.current.has(responseId) || queuedNotificationResponseIdsRef.current.has(responseId)) return;
      queuedNotificationResponseIdsRef.current.add(responseId);
      pendingNotificationResponseRef.current = response;
      setNotificationResponseVersion((version) => version + 1);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(queueNotificationResponse);
    // Expo retains the last response across launches. Keep a valid launch tap
    // in memory, but clear the native copy so an ordinary later launch cannot
    // replay the old response into Notifications.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        queueNotificationResponse(response);
        if (response) void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, []);

  // Consume notification taps only after the approved account and navigator
  // are ready. Each role has an allow-listed internal resolver; an unknown
  // Public User payload opens Notifications instead of a bare custom URL.
  useEffect(() => {
    if (!isAppReady || !isSignedIn || verificationStatus !== 'approved') return;
    const response = pendingNotificationResponseRef.current;
    if (!response) return;

    const responseId = response.notification.request.identifier;
    const data = response.notification.request.content.data;

    if (role === 'ambulance_responder') {
      const route = resolveResponderNotificationRoute(data);
      if (!route) {
        handledNotificationResponseIdsRef.current.add(responseId);
        pendingNotificationResponseRef.current = null;
        return;
      }
      handledNotificationResponseIdsRef.current.add(responseId);
      pendingNotificationResponseRef.current = null;
      router.replace(route as never);
      return;
    }

    if (role === 'public_user') {
      const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const route = resolvePublicNotificationRoute({
        type: payload.type,
        kind: payload.kind,
        metadata: payload.metadata ?? payload,
      });
      handledNotificationResponseIdsRef.current.add(responseId);
      pendingNotificationResponseRef.current = null;
      if (route?.details) useEmergencyReportStore.getState().setDetails(route.details);
      router.replace((route?.pathname ?? '/notifications') as never);
    }
  }, [isAppReady, isSignedIn, notificationResponseVersion, role, router, verificationStatus]);

  useEffect(() => {
    if (!isSignedIn || verificationStatus !== 'approved' || role !== 'ambulance_responder') return;
    registerResponderPushNotifications().catch((error) => {
      console.warn('[Push] Responder push setup was not completed.', error);
    });
    const subscription = subscribeToPushTokenChanges();
    return () => subscription.remove();
  }, [isSignedIn, role, verificationStatus]);

  // Offline responder actions are account-bound. Hydrate them only after the
  // approved responder session exists so a queued hospital confirmation can be
  // replayed after an Android process restart without crossing accounts.
  useEffect(() => {
    if (!isSignedIn || verificationStatus !== 'approved' || role !== 'ambulance_responder' || !user?.id) return;
    void loadOfflineQueue();
  }, [isSignedIn, loadOfflineQueue, role, user?.id, verificationStatus]);

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
    const inEmergencyIntake = rawSegments[0] === 'help';

    // Allow the EntryScreen in app/index.tsx to handle the splash sequence
    // and route the user when the animation finishes.
    if (atRoot) return;

    if (isResetPassword) return;

    if (!isSignedIn) {
      // Not signed in: allow root (for role selection), redirect otherwise
      if (!inAuthGroup && !inEmergencyIntake) {
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
      } else if (verificationStatus === 'banned') {
        if (!inVerificationGroup || rawSegments[1] !== 'banned') {
          // Expo's generated route union is refreshed by the next app build;
          // retain the explicit group route during this source-only check.
          router.replace('/(verification)/banned' as never);
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
  }, [isSignedIn, isAppReady, router, verificationStatus, segments]);

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
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
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
