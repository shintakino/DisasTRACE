import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { height } = Dimensions.get('window');

interface SplashSequenceProps {
  onFinish: () => void;
}

export function SplashSequence({ onFinish }: SplashSequenceProps) {
  const [phase, setPhase] = useState(0);

  // Pulse line
  const pulseOpacity = useSharedValue(0);
  const pulseScaleX = useSharedValue(0);

  // Logo
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.6);
  const logoTranslateY = useSharedValue(0);

  // Glow
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.9);

  // Tagline
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);

  useEffect(() => {
    // Phase 0: Pulse line draws across screen (0ms - 1200ms)
    pulseOpacity.value = withTiming(1, { duration: 800 });
    pulseScaleX.value = withTiming(1, { duration: 1000 });

    // Phase 1: Pulse fades out, logo begins to appear (1800ms)
    const timer1 = setTimeout(() => {
      setPhase(1);
      pulseOpacity.value = withTiming(0, { duration: 600 });
      logoOpacity.value = withTiming(1, { duration: 800 });
    }, 1800);

    // Phase 2: Logo scales up to full size, glow pulses (3200ms)
    const timer2 = setTimeout(() => {
      setPhase(2);
      logoScale.value = withSpring(1, { damping: 12, stiffness: 80 });
      logoTranslateY.value = withSpring(-40, { damping: 12, stiffness: 80 });
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1500 }),
          withTiming(0.9, { duration: 1500 })
        ),
        -1,
        true
      );
    }, 3200);

    // Phase 3: Tagline fades in below the logo (4600ms)
    const timer3 = setTimeout(() => {
      setPhase(3);
      taglineOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) });
      taglineTranslateY.value = withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) });
    }, 4600);

    // Hold the final state for 1.5s then finish (6500ms)
    const timer4 = setTimeout(() => onFinish(), 6500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onFinish]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scaleX: pulseScaleX.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Pulse Line */}
      <Animated.View style={[styles.pulseLine, pulseStyle]} />

      {/* Logo + Glow */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image
          source={require('../assets/images/DisasTRACELogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View style={[styles.glow, glowStyle]} />
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Emergency Response Coordination
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseLine: {
    width: '60%',
    height: 2,
    backgroundColor: '#EF4444',
    borderRadius: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  logo: {
    width: 220,
    height: 220,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#EF4444',
    zIndex: -1,
  },
  tagline: {
    position: 'absolute',
    bottom: height * 0.15,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
