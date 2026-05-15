import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { Home, Ambulance, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export function RoleSelection() {
  const router = useRouter();

  const handleRoleSelect = (role: 'public_user' | 'ambulance_responder') => {
    router.push({
      pathname: '/(auth)/sign-in',
      params: { role }
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E293B', '#F3F4F6']}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View
        entering={FadeInDown.duration(800)}
        style={styles.content}
      >
        <Text style={styles.title}>Identify Your Role</Text>
        <Text style={styles.subtitle}>Select how you will use DisasTRACE</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => handleRoleSelect('public_user')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
            <Home size={32} color="#0369A1" strokeWidth={1.5} />
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
          style={styles.card}
          onPress={() => handleRoleSelect('ambulance_responder')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ambulance size={32} color="#B91C1C" strokeWidth={1.5} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
