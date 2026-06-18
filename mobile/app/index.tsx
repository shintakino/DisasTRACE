import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';
import { Home, Ambulance, ChevronRight } from 'lucide-react-native';
import { useAuthStatus } from '../hooks/use-auth-status';

const { width } = Dimensions.get('window');

let hasShownSplashGlobal = false;

export default function EntryScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, verificationStatus } = useAuthStatus();

  const glowOpacity = useSharedValue(hasShownSplashGlobal ? 1 : 0);
  const glowScale = useSharedValue(hasShownSplashGlobal ? 1.2 : 0.7);
  const logoOpacity = useSharedValue(hasShownSplashGlobal ? 1 : 0);
  const logoTranslate = useSharedValue(hasShownSplashGlobal ? (isSignedIn ? 0 : -220) : 20);
  const cardTranslate = useSharedValue(hasShownSplashGlobal ? 0 : 120);
  const cardOpacity = useSharedValue(hasShownSplashGlobal ? 1 : 0);
  const trackingTranslateX = useSharedValue(hasShownSplashGlobal ? 0 : -width * 1.5);
  const ambulanceDriveOffX = useSharedValue(hasShownSplashGlobal ? width : 0);

  useEffect(() => {
    if (!isLoaded) return; // wait for auth session

    async function prepare() {
      // Hide native splash once we start our animation
      await SplashScreen.hideAsync();

      if (hasShownSplashGlobal) {
        if (isSignedIn) {
          if (verificationStatus === 'approved') {
            router.replace('/(tabs)');
          } else if (verificationStatus === 'pending') {
            router.replace('/(verification)/pending');
          } else if (verificationStatus === 'rejected') {
            router.replace('/(verification)/rejected');
          } else {
            router.replace('/(verification)/unauthorized');
          }
        }
        return;
      }

      glowOpacity.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.exp),
      });

      glowScale.value = withTiming(1.2, {
        duration: 1800,
        easing: Easing.out(Easing.exp),
      });

      logoOpacity.value = withDelay(
        700,
        withTiming(1, { duration: 800 })
      );

      logoTranslate.value = withDelay(
        700,
        withTiming(isSignedIn ? 0 : -220, {
          duration: 800,
          easing: Easing.out(Easing.exp),
        })
      );

      trackingTranslateX.value = withDelay(
        1100,
        withTiming(0, {
          duration: 1400,
          easing: Easing.out(Easing.cubic),
        })
      );

      ambulanceDriveOffX.value = withDelay(
        2600,
        withTiming(width, {
          duration: 1000,
          easing: Easing.in(Easing.cubic),
        })
      );

      if (isSignedIn) {
        setTimeout(() => {
          if (verificationStatus === 'approved') {
            router.replace('/(tabs)');
          } else if (verificationStatus === 'pending') {
            router.replace('/(verification)/pending');
          } else if (verificationStatus === 'rejected') {
            router.replace('/(verification)/rejected');
          } else {
            router.replace('/(verification)/unauthorized');
          }
        }, 3600);
      } else {
        // If not signed in, show the role selection card
        cardTranslate.value = withDelay(
          1500,
          withTiming(0, {
            duration: 700,
            easing: Easing.out(Easing.exp),
          })
        );

        cardOpacity.value = withDelay(
          1500,
          withTiming(1, { duration: 600 })
        );
      }

      hasShownSplashGlobal = true;
    }

    prepare();
  }, [isLoaded, isSignedIn, verificationStatus]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslate.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  const trackingStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackingTranslateX.value }],
  }));

  const ambulanceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ambulanceDriveOffX.value }],
  }));

  if (!isLoaded) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowWrapper, glowStyle]}>
        <LinearGradient
          colors={['#4FC3F7', '#42A5F500', '#42A5F500']}
          style={styles.glow}
        />
      </Animated.View>

      <Animated.View style={[logoStyle, { alignItems: 'center', width }]}>
        <Image
          source={require('../assets/images/DisasTRACELogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View style={[styles.trackingContainer, trackingStyle]}>
          <View style={{ maxWidth: '100%' }}>
            <Text 
              style={styles.tagline}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              SECONDS COUNT. LIVES MATTER.
            </Text>
            <Animated.View style={[styles.ambulanceWrapper, ambulanceStyle]}>
              <Image
                source={require('../assets/images/ambulance.png')}
                style={{ width: 150, height: 90 }}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>

      {!isSignedIn && (
        <Animated.View style={[styles.bottomCard, cardStyle]}>
          <Text style={styles.title}>The Pulse of Safety</Text>
          <Text style={styles.subtitle}>Welcome to DisasTRACE Emergency Portal</Text>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/(auth)/sign-in')}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E43B8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glowWrapper: {
    position: 'absolute',
    bottom: -120,
  },
  glow: {
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width,
  },
  logo: {
    width: 260,
    height: 380,
  },
  tagline: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  trackingContainer: {
    position: 'absolute',
    bottom: 85,
    width: '100%',
    paddingRight: 35,
    alignItems: 'flex-end',
  },
  ambulanceWrapper: {
    position: 'absolute',
    right: -165,
    top: -35,
    zIndex: 10,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 40,
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#15286A',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#15286A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#15286A',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButtonText: {
    color: '#15286A',
    fontSize: 18,
    fontWeight: '700',
  },
});
