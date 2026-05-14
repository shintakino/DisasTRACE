import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { SplashScreenSequence } from '../components/SplashScreenSequence';
import { RoleCard } from '../components/RoleCard';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { MotiView } from 'moti';

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
       // If signed in, the layout will handle redirection to (tabs)
       // But we hide the splash if we're already authenticated to speed up entry
       setShowSplash(false);
    }
  }, [isLoaded, isSignedIn]);

  const handleFinishSplash = () => {
    setShowSplash(false);
  };

  const handleRoleSelect = async (role: 'resident' | 'responder') => {
    try {
      await SecureStore.setItemAsync('selected_role', role);
      router.push('/(auth)/sign-in');
    } catch (error) {
      console.error('Failed to save role selection', error);
      router.push('/(auth)/sign-in');
    }
  };

  if (showSplash) {
    return <SplashScreenSequence onFinish={handleFinishSplash} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MotiView
          from={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.container}
        >
          <Text style={styles.title}>
            Welcome to DisasTRACE
          </Text>
          <Text style={styles.subtitle}>
            Are you a Resident or a Responder?
          </Text>

          <View style={styles.cardContainer}>
            <RoleCard role="resident" onPress={() => handleRoleSelect('resident')} />
            <RoleCard role="responder" onPress={() => handleRoleSelect('responder')} />
          </View>

          <Text style={styles.footerText}>
            Baliwag Disaster Risk Reduction and Management Office
          </Text>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  cardContainer: {
    width: '100%',
  },
  footerText: {
    marginTop: 40,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
