import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Star } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

export default function ResolutionScreen() {
  const router = useRouter();
  const resetReport = useEmergencyReportStore((state) => state.resetReport);
  
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleReturnHome = () => {
    // In a real app, submit the rating/feedback to Supabase here
    resetReport();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {/* Success Header */}
        <View style={styles.headerArea}>
          <View style={styles.iconCircle}>
            <CheckCircle2 color="#22C55E" size={48} />
          </View>
          <Text style={styles.title}>Emergency Resolved</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Report ID</Text>
            <Text style={styles.summaryValue}>REQ-2026-0047</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dispatched Unit</Text>
            <Text style={styles.summaryValue}>Ambulance Unit 3</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Duration</Text>
            <Text style={styles.summaryValue}>12 Minutes</Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Rate the response service</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
              >
                <Star
                  size={40}
                  color={star <= rating ? '#FBBF24' : '#E2E8F0'}
                  fill={star <= rating ? '#FBBF24' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.feedbackInput}
            placeholder="Tell us how we did... (Optional)"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>

        <View style={{ flex: 1 }} />

        {/* Action Button */}
        <TouchableOpacity style={styles.returnButton} onPress={handleReturnHome} activeOpacity={0.8}>
          <Text style={styles.returnButtonText}>RETURN TO HOME</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCFCE7', // Green 100
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A', // Navy
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  ratingSection: {
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  starButton: {
    padding: 8,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
    color: '#0F172A',
  },
  returnButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  returnButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  }
});
