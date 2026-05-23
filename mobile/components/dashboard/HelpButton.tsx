import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface HelpButtonProps {
  onPress: () => void;
}

export function HelpButton({ onPress }: HelpButtonProps) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Primary pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Secondary glow ring animation
    ringScale.value = withRepeat(
      withTiming(1.4, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 0 }),
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View className="items-center justify-center">
      {/* Secondary Glow Ring */}
      <Animated.View 
        style={animatedRingStyle}
        className="absolute w-44 h-44 rounded-full bg-red-500/30"
      />
      
      {/* Primary HELP Button */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onPress}
      >
        <Animated.View 
          style={animatedButtonStyle}
          className="w-40 h-40 rounded-full overflow-hidden items-center justify-center shadow-2xl shadow-red-600/50"
        >
          <LinearGradient
            colors={['#DC2626', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0"
          />
          <Text className="text-white text-5xl font-black tracking-tighter">HELP</Text>
          <Text className="text-white/80 text-[10px] font-light tracking-[2px] mt-1">TAP TO REPORT</Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}
