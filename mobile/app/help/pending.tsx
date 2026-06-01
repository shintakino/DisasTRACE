import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldAlert, CheckCircle, Navigation } from 'lucide-react-native';
import { TransmissionLoader } from '../../components/help/TransmissionLoader';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';

export default function PendingScreen() {
  const router = useRouter();
  const report = useEmergencyReportStore((state) => state.report);
  
  const [isTransmitting, setIsTransmitting] = useState(true);
  const [transmissionStatus, setTransmissionStatus] = useState('Uploading incident media...');
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAccepted, setIsAccepted] = useState(false); // Simulate acceptance

  // Real-time verification request listener
  useEffect(() => {
    const requestId = report.id;
    if (!requestId) return;

    console.log('[PendingScreen] Subscribing to status changes for request ID:', requestId);

    const channel = supabase
      .channel(`pending-request-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'verification_requests',
          filter: `id=eq.${requestId}`,
        },
         async (payload) => {
          console.log('[PendingScreen] Verification request update received:', payload.new);
          if (payload.new && payload.new.status === 'VERIFIED') {
            const fetchIncidentWithRetry = async (retriesLeft = 5, delayMs = 500): Promise<boolean> => {
              try {
                const { data: incident, error } = await supabase
                  .from('incidents')
                  .select('*')
                  .eq('request_id', requestId)
                  .maybeSingle();

                if (error) {
                  console.error('[PendingScreen] Error querying incident:', error);
                }

                if (incident) {
                  console.log('[PendingScreen] Successfully fetched incident details:', incident.id);
                  useEmergencyReportStore.setState((state) => ({
                    report: {
                      ...state.report,
                      incidentId: incident.id
                    }
                  }));
                  return true;
                }
              } catch (err) {
                console.error('[PendingScreen] Try-catch error querying incident:', err);
              }

              if (retriesLeft > 0) {
                console.log(`[PendingScreen] Incident not found yet. Retrying in ${delayMs}ms... (${retriesLeft} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                return fetchIncidentWithRetry(retriesLeft - 1, delayMs);
              }
              console.warn('[PendingScreen] Failed to find incident after maximum retries.');
              return false;
            };

            await fetchIncidentWithRetry();
            setIsAccepted(true);
          } else if (payload.new && payload.new.status === 'REJECTED') {
            // Tactile haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            
            // Unsubscribe channel
            supabase.removeChannel(channel);
            
            // Clear local report details from store
            useEmergencyReportStore.getState().resetReport();
            
            // Alert user and redirect back to dashboard
            Alert.alert(
              "Report Dismissed",
              "Baliwag CDRRMO PACC has rejected or dismissed your incident report. If this is an error, please try submitting again or call PACC directly.",
              [
                { 
                  text: "OK", 
                  onPress: () => router.replace('/(tabs)') 
                }
              ],
              { cancelable: false }
            );
          } else if (payload.new && payload.new.status === 'DUPLICATE') {
            const parentId = payload.new.parent_request_id || payload.new.parentRequestId;
            if (parentId) {
              console.log('[PendingScreen] Incident merged as duplicate of parent:', parentId);
              
              // 1. Fetch the incident associated with the parent request
              const fetchParentIncidentWithRetry = async (retriesLeft = 5, delayMs = 500): Promise<boolean> => {
                try {
                  const { data: incident, error } = await supabase
                    .from('incidents')
                    .select('*')
                    .eq('request_id', parentId)
                    .maybeSingle();

                  if (incident) {
                    console.log('[PendingScreen] Successfully fetched parent incident details:', incident.id);
                    
                    // We update the state with the parent requestId and incidentId so we track it!
                    useEmergencyReportStore.setState((state) => ({
                      report: {
                        ...state.report,
                        id: parentId, // Set to parent ID so tracking queries parent telemetry!
                        incidentId: incident.id,
                        isMergedDuplicate: true // Flag to show customized overlay notice
                      }
                    }));
                    return true;
                  }
                } catch (err) {
                  console.error('[PendingScreen] Error querying parent incident:', err);
                }

                if (retriesLeft > 0) {
                  await new Promise((resolve) => setTimeout(resolve, delayMs));
                  return fetchParentIncidentWithRetry(retriesLeft - 1, delayMs);
                }
                return false;
              };

              await fetchParentIncidentWithRetry();
              
              // Tactile success haptic
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              
              // Show customized warning/alert and redirect to tracking
              Alert.alert(
                "Emergency Merged",
                "Another bystander has already reported this emergency. An ambulance crew is already en route. We are transferring you to the active tracking view.",
                [
                  { 
                    text: "Track Ambulance", 
                    onPress: () => {
                      supabase.removeChannel(channel);
                      router.push('/help/tracking');
                    }
                  }
                ],
                { cancelable: false }
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [report.id]);

  // Trigger tactile haptic success feedback and start auto-navigation timer when accepted
  useEffect(() => {
    if (isAccepted) {
      // 1. Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // 2. Auto-navigation after 2.5 seconds
      const timer = setTimeout(() => {
        router.push('/help/tracking');
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isAccepted]);

  useEffect(() => {
    // Simulate Transmission
    const timer1 = setTimeout(() => {
      setTransmissionStatus('Transmitting coordinates to PACC Command Center...');
    }, 1500);

    const timer2 = setTimeout(() => {
      setIsTransmitting(false);
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!isTransmitting && !isAccepted) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTransmitting, isAccepted]);

  const handleCancel = () => {
    Alert.alert(
      "Cancel Report",
      "Are you sure you want to cancel this report? This will alert the dispatcher.",
      [
        { text: "No, Keep Report", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: () => router.navigate('/(tabs)')
        }
      ]
    );
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };



  return (
    <View style={styles.container}>
      <TransmissionLoader visible={isTransmitting} statusText={transmissionStatus} />
      
      {!isTransmitting && (
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AWAITING VERIFICATION</Text>
          </View>
          
          <Text style={styles.timerText}>Time Elapsed: {formatTime(elapsedSeconds)}</Text>
          
          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <ShieldAlert color="#1E3A8A" size={24} />
              <Text style={styles.safetyTitle}>What to do while waiting</Text>
            </View>
            <Text style={styles.safetyInstruction}>• Stay clear of hazards.</Text>
            <Text style={styles.safetyInstruction}>• Check if victims are breathing.</Text>
            <Text style={styles.safetyInstruction}>• Do not move severely injured victims unless absolutely necessary.</Text>
            <Text style={styles.safetyInstruction}>• Keep your phone nearby to track ambulance arrival.</Text>
          </View>



          <View style={{ flex: 1 }} />

          {elapsedSeconds < 60 ? (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.cancelButtonText}>CANCEL REPORT</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.cancelButton, { backgroundColor: '#1E3A8A' }]} 
              onPress={() => Linking.openURL('tel:09436018271')} 
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CALL PACC COMMAND CENTER</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Acceptance Modal (Image 11) */}
      <Modal visible={isAccepted} transparent animationType="slide">
        <View style={styles.acceptanceOverlay}>
          <View style={styles.iconCircle}>
            <CheckCircle color="#22C55E" size={64} />
          </View>
          <Text style={styles.acceptanceTitle}>EMERGENCY ACCEPTED</Text>
          <Text style={styles.acceptanceMessage}>
            Baliwag CDRRMO has verified your report. Ambulance Unit 3 is being dispatched to your location immediately.
          </Text>
          
          <TouchableOpacity 
            style={styles.trackButton} 
            onPress={() => router.push('/help/tracking')}
            activeOpacity={0.8}
          >
            <Navigation color="#FFF" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.trackButtonText}>TRACK AMBULANCE</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
  },
  badge: {
    backgroundColor: '#FEF08A', // Yellow 200
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeText: {
    color: '#854D0E', // Yellow 800
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#0F172A',
    marginBottom: 48,
    fontVariant: ['tabular-nums'],
  },
  safetyCard: {
    backgroundColor: '#FFF',
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginLeft: 12,
  },
  safetyInstruction: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 8,
  },
  devTrigger: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  devTriggerText: {
    color: '#64748B',
    fontSize: 12,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  acceptanceOverlay: {
    flex: 1,
    backgroundColor: '#020617', // Navy 950
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // Green tinted
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  acceptanceTitle: {
    color: '#22C55E', // Green 500
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  acceptanceMessage: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  }
});
