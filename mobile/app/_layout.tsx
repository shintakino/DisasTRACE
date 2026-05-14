import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import '../global.css';
import { setApiToken, apiClient } from '@/services/api';

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log('No values stored under key: ' + key);
      }
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  );
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <RootLayoutNav />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const checkAuth = async () => {
      const token = await getToken();
      setApiToken(token);

      const inAuthGroup = segments[0] === '(auth)';
      const inVerificationGroup = segments[0] === '(verification)';

      if (!isSignedIn) {
        const atRoot = segments.length === 0;
        if (!inAuthGroup && !atRoot) {
          router.replace('/(auth)/sign-in');
        }
        setIsVerifying(false);
        return;
      }

      // If signed in, check verification status
      try {
        const response = await apiClient.get('/users/me');
        const { verification_status } = response.data;
        
        const status = verification_status || 'pending';
        
        if (status === 'pending') {
          if (segments[1] !== 'pending') {
            router.replace('/(verification)/pending');
          }
        } else if (status === 'rejected') {
          if (segments[1] !== 'rejected') {
            router.replace('/(verification)/rejected');
          }
        } else if (status === 'approved') {
          if (inAuthGroup || inVerificationGroup || segments.length === 0 || segments[0] === '(tabs)' && segments.length === 1) {
             // If we are at root or in auth/verification groups, go to tabs
             if (inAuthGroup || inVerificationGroup || segments.length === 0) {
                router.replace('/(tabs)');
             }
          }
        }
      } catch (error) {
        console.error("Verification check failed", error);
        // Fallback to Clerk metadata if API fails
        const status = (user?.publicMetadata?.verification_status as string) || 'approved';
        
        if (status === 'pending') {
          if (segments[1] !== 'pending') {
            router.replace('/(verification)/pending');
          }
        } else if (status === 'rejected') {
          if (segments[1] !== 'rejected') {
            router.replace('/(verification)/rejected');
          }
        } else if (status === 'approved') {
          if (inAuthGroup || inVerificationGroup || segments.length === 0) {
            router.replace('/(tabs)');
          }
        }
      } finally {
        setIsVerifying(false);
      }
    };

    checkAuth();
  }, [isSignedIn, isLoaded, user, segments]);

  if (!isLoaded || isVerifying) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(verification)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
