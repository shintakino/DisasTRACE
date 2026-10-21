import { Stack, useNavigationContainerRef, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { LogBox, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthStatusProvider, useAuthStatus } from '../hooks/use-auth-status';
import { useMobilePushRegistration } from '../hooks/use-mobile-push-registration';
import { resolveResponderNotificationRoute } from '../lib/responder-notification-route';
import { resolvePublicNotificationRoute } from '../lib/public-notification-route';
import { consumeNotificationResponseDurably } from '../lib/notification-response-consumption';
import { openNotificationRoute } from '../lib/open-notification-route';
import { rememberRecoveryUrl } from '../lib/recovery-link-inbox';
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

// Android can return the last notification response after a process restart.
// Keep the last consumed identifier in encrypted storage so a process crash
// between receipt and navigation cannot reopen an old notification route.
const LAST_HANDLED_NOTIFICATION_RESPONSE_KEY = 'disas_trace_last_handled_notification_response';

// Prevent the native splash screen from auto-hiding.
SplashScreen.preventAutoHideAsync();

// Process-wide foreground policy. Screens must not compete for permission
// prompts or replace this handler on every Home/Notifications transition.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
  }),
});

function InitialLayout() {
  const { isLoaded, isSignedIn, verificationStatus, role, user, session } = useAuthStatus();
  useMobilePushRegistration(
    user?.id ?? null,
    verificationStatus === 'approved' && (role === 'ambulance_responder' || role === 'public_user') ? role : null,
    session?.access_token ?? null,
  );
  const loadOfflineQueue = useResponderStore((state) => state.loadOfflineQueue);
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const [isAppReady, setIsAppReady] = useState(false);
  const [notificationResponseVersion, setNotificationResponseVersion] = useState(0);
  const pendingNotificationResponseRef = useRef<Notifications.NotificationResponse | null>(null);
  const handledNotificationResponseIdsRef = useRef(new Set<string>());
  const queuedNotificationResponseIdsRef = useRef(new Set<string>());
  const consumingNotificationResponseIdRef = useRef<string | null>(null);
  const notificationConsumptionRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Capture the complete native URL before Expo Router normalizes it into
  // route segments. This covers cold starts and links opened while the app is
  // already running without persisting one-time recovery credentials.
  useEffect(() => {
    let active = true;
    const captureUrl = (incomingUrl: string | null) => {
      if (active && incomingUrl) rememberRecoveryUrl(incomingUrl);
    };

    void Linking.getInitialURL()
      .then(captureUrl)
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', ({ url }) => captureUrl(url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  // Preserve notification taps until auth and the root navigator are ready.
  // Android must never fall back to a bare `disastrace:///` URI for a responder alert.
  useEffect(() => {
    const queueNotificationResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const responseId = response.notification.request.identifier;
      if (
        pendingNotificationResponseRef.current
        || handledNotificationResponseIdsRef.current.has(responseId)
        || queuedNotificationResponseIdsRef.current.has(responseId)
      ) return;
      queuedNotificationResponseIdsRef.current.add(responseId);
      pendingNotificationResponseRef.current = response;
      setNotificationResponseVersion((version) => version + 1);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(queueNotificationResponse);
    // Expo retains the last response across launches. Keep a valid launch tap
    // in memory, but clear the native copy so an ordinary later launch cannot
    // replay the old response into Notifications.
    Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!response) return;
        const responseId = response.notification.request.identifier;
        const lastHandledResponseId = await SecureStore.getItemAsync(LAST_HANDLED_NOTIFICATION_RESPONSE_KEY).catch(() => null);

        // Clear the Android-owned copy before routing. A persisted handled ID
        // remains a second line of defence if the native clear call is delayed.
        await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        if (lastHandledResponseId === responseId) return;
        queueNotificationResponse(response);
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, []);

  useEffect(() => () => {
    if (notificationConsumptionRetryRef.current) {
      clearTimeout(notificationConsumptionRetryRef.current);
    }
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
    if (consumingNotificationResponseIdRef.current === responseId) return;
    consumingNotificationResponseIdRef.current = responseId;

    const scheduleConsumptionRetry = () => {
      consumingNotificationResponseIdRef.current = null;
      if (notificationConsumptionRetryRef.current) return;
      notificationConsumptionRetryRef.current = setTimeout(() => {
        notificationConsumptionRetryRef.current = null;
        setNotificationResponseVersion((version) => version + 1);
      }, 1_000);
    };

    const consumeAndRoute = async () => {
      if (!navigationRef.isReady()) {
        scheduleConsumptionRetry();
        return;
      }
      const consumed = await consumeNotificationResponseDurably({
        responseId,
        persistHandledResponseId: (id) => SecureStore.setItemAsync(LAST_HANDLED_NOTIFICATION_RESPONSE_KEY, id),
        clearNativeResponse: () => Notifications.clearLastNotificationResponseAsync(),
      });

      if (!consumed) {
        console.warn('[Notifications] Could not durably consume a notification response; routing will retry.');
        scheduleConsumptionRetry();
        return;
      }

      handledNotificationResponseIdsRef.current.add(responseId);
      queuedNotificationResponseIdsRef.current.delete(responseId);
      pendingNotificationResponseRef.current = null;
      consumingNotificationResponseIdRef.current = null;

      if (role === 'ambulance_responder') {
        const route = resolveResponderNotificationRoute(data);
        openNotificationRoute(router, navigationRef.getRootState(), route ?? '/notifications');
        return;
      }

      if (role === 'public_user') {
        const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
        const route = resolvePublicNotificationRoute({
          type: payload.type,
          kind: payload.kind,
          metadata: payload.metadata ?? payload,
        });
        if (route?.details) useEmergencyReportStore.getState().setDetails(route.details);
        openNotificationRoute(router, navigationRef.getRootState(), route?.pathname ?? '/notifications');
      }
    };

    void consumeAndRoute().catch((error) => {
      console.error('[Notifications] Failed to consume notification response:', error);
      scheduleConsumptionRetry();
    });
  }, [isAppReady, isSignedIn, navigationRef, notificationResponseVersion, role, router, verificationStatus]);

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
      <AuthStatusProvider>
        <InitialLayout />
      </AuthStatusProvider>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
