import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Star } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { supabase } from '../../lib/supabase';

export default function ResolutionScreen() {
  const router = useRouter();
  const report = useEmergencyReportStore((state) => state.report);
  const resetReport = useEmergencyReportStore((state) => state.resetReport);
  
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '12 Minutes'; // Fallback
    if (seconds < 60) return `${seconds} Seconds`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins} Minute${mins > 1 ? 's' : ''}`;
    return `${mins} Min${mins > 1 ? 's' : ''} ${secs} Sec${secs > 1 ? 's' : ''}`;
  };
 
  useEffect(() => {
    const onBackPress = () => {
      resetReport();
      router.replace('/(tabs)');
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleReturnHome = () => {
    // Only submit feedback if a rating star was selected (rating > 0)
    if (rating > 0) {
      (async () => {
        try {
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
          const { data: { session } } = await supabase.auth.getSession();
          const reqHeaders: any = { 'Content-Type': 'application/json' };
          if (session?.access_token) {
            reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
          }
     
          await fetch(`${apiUrl}/api/incidents/feedback`, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify({
              incidentId: report.incidentId || undefined,
              requestId: report.id || undefined,
              rating,
              feedback: feedback || undefined,
            })
          });
        } catch (err) {
          console.log('Feedback background submission failed:', err);
        }
      })();
    }
    
    resetReport();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
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
            <Text style={styles.summaryValue}>{report.requestId || 'REQ-2026-0047'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Dispatched Unit</Text>
            <Text style={styles.summaryValue}>
              {report.responderVehicleId 
                ? `${report.responderVehicleId}${report.responderFullName ? ` (${report.responderFullName})` : ''}` 
                : (report.incidentId ? 'AMB-001 (Dispatched)' : 'Ambulance Unit 3')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Duration</Text>
            <Text style={styles.summaryValue}>{formatDuration(report.totalDurationSeconds)}</Text>
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

        {/* Action Button */}
        <TouchableOpacity style={styles.returnButton} onPress={handleReturnHome} activeOpacity={0.8}>
          <Text style={styles.returnButtonText}>RETURN TO HOME</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7', // Green 100
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E3A8A', // Navy
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 0,
  },
  summaryValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  }
});
