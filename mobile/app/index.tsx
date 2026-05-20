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

export default function EntryScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, verificationStatus } = useAuthStatus();

  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const logoTranslate = useSharedValue(20);
  const cardTranslate = useSharedValue(120);
  const cardOpacity = useSharedValue(0);
  const trackingTranslateX = useSharedValue(-width * 1.5);
  const ambulanceDriveOffX = useSharedValue(0);

  useEffect(() => {
    if (!isLoaded) return; // wait for auth session

    async function prepare() {
      // Hide native splash once we start our animation
      await SplashScreen.hideAsync();

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
    }

    prepare();
  }, [isLoaded, isSignedIn, verificationStatus]);

  const handleRoleSelect = (role: 'public_user' | 'ambulance_responder') => {
    router.push({
      pathname: '/(auth)/sign-in',
      params: { role }
    });
  };

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
          <Text style={styles.title}>Identify Your Role</Text>
          <Text style={styles.subtitle}>Select how you will use DisasTRACE</Text>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect('public_user')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
              <Home size={28} color="#0369A1" strokeWidth={1.5} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Resident</Text>
              <Text style={styles.cardDescription}>
                I need assistance or want to report an incident.
              </Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => handleRoleSelect('ambulance_responder')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ambulance size={28} color="#B91C1C" strokeWidth={1.5} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Responder</Text>
              <Text style={styles.cardDescription}>
                I am part of the emergency response team.
              </Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
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
    width: 560,
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
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
