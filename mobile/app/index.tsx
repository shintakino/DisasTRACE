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

  useEffect(() => {
    if (!isLoaded) return; // wait for clerk

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
        withTiming(0, {
          duration: 800,
          easing: Easing.out(Easing.exp),
        })
      );

      // If signed in, we navigate away after the logo animation
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
        }, 2500);
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

  if (!isLoaded) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glowWrapper, glowStyle]}>
        <LinearGradient
          colors={['#4FC3F7', '#42A5F500', '#42A5F500']}
          style={styles.glow}
        />
      </Animated.View>

      <Animated.View style={logoStyle}>
        <Image
          source={require('../assets/images/DisasTRACELogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
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
    width: 220,
    height: 120, // Maintain space roughly but allow contain to scale properly. We can use 220x120 for now.
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
