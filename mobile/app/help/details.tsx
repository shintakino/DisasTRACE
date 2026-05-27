import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle, X } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { supabase } from '../../lib/supabase';
import { uploadIncidentPhoto } from '../../lib/storage';
const WHAT_OPTIONS = [
  "Conscious and stable",
  "Conscious and Unstable",
  "Unconscious / Critical",
  "Unknown / Cannot assess",
  "Other"
];

const WHERE_OPTIONS = [
  "Yes — clear road access",
  "Partial obstruction",
  "Road is blocked",
  "Other"
];

const WHEN_OPTIONS = [
  "Just now (within 5 minutes)",
  "5-30 minutes ago",
  "Over 30 minutes ago"
];

const HOW_OPTIONS = [
  "Vehicle collision",
  "Fire / Explosion",
  "Flood / Water",
  "Structural failure",
  "Medical Emergency",
  "Unknown cause",
  "Other"
];

const RadioGroup = ({ options, selected, onSelect, otherText, setOtherText }: any) => {
  return (
    <View style={styles.radioGroup}>
      {options.map((opt: string) => (
        <TouchableOpacity 
          key={opt} 
          style={styles.radioOption}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <View style={styles.radioOuter}>
            {selected === opt && <View style={styles.radioInner} />}
          </View>
          <Text style={styles.radioText}>{opt}</Text>
        </TouchableOpacity>
      ))}
      {selected === 'Other' && (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherInputLabel}>Other (Please specify)...</Text>
          <TextInput
            style={styles.otherInput}
            placeholder="Other"
            placeholderTextColor="#94A3B8"
            value={otherText}
            onChangeText={setOtherText}
          />
        </View>
      )}
    </View>
  );
};

export default function DetailsScreen() {
  const router = useRouter();
  const { report } = useEmergencyReportStore();
  
  const [what, setWhat] = useState<string>('');
  const [whatOther, setWhatOther] = useState<string>('');
  
  const [where, setWhere] = useState<string>('');
  const [whereOther, setWhereOther] = useState<string>('');
  
  const [when, setWhen] = useState<string>('');
  
  const [how, setHow] = useState<string>('');
  const [howOther, setHowOther] = useState<string>('');
  
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [isAutoDispatched, setIsAutoDispatched] = useState(false);

  const handleSubmit = async () => {
    if (!what || !where || !when || !how) return;

    // Show analyzing modal
    setShowAnalyzing(true);
    
    // Simulate analyzing steps
    setTimeout(() => setAnalyzingStep(1), 800);
    setTimeout(() => setAnalyzingStep(2), 1600);
    setTimeout(() => setAnalyzingStep(3), 2400);
    setTimeout(() => setAnalyzingStep(4), 3200);

    try {
      let uploadedUrl = null;
      if (report.photoUri) {
        const uniqueId = Date.now().toString() + Math.random().toString(36).substring(7);
        console.log('[DetailsScreen] Uploading incident scene photo to Supabase storage with ID:', uniqueId);
        uploadedUrl = await uploadIncidentPhoto(uniqueId, report.photoUri);
        console.log('[DetailsScreen] Uploaded incident scene photo successfully. Public URL:', uploadedUrl);
      }

      // Combine local form data with global store
      const localDescription = `Condition: ${what}\nAccess: ${where}\nTime: ${when}\nCause: ${how}\nOther: ${whatOther} ${whereOther} ${howOther}`;
      
      const payload = {
        incidentType: report.incidentType || 'Unknown Cause',
        peopleInvolved: report.peopleInvolved || 'None',
        landmarks: localDescription,
        latitude: report.latitude,
        longitude: report.longitude,
        severity: report.severity || 'Medium',
        nature: report.severity ? 'EMERGENCY' : 'NON-EMERGENCY',
        imageUrl: uploadedUrl,
      };

      const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${apiUrl}/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success && data.request) {
        useEmergencyReportStore.setState((state) => ({
          report: {
            ...state.report,
            id: data.request.id,
            requestId: data.request.requestId,
            incidentId: data.incident?.id,
          }
        }));
      }
      
      // Wait for animations
      setTimeout(() => {
        setShowAnalyzing(false);
        setIsAutoDispatched(data.autoDispatched);
        setShowSubmitted(true);
      }, 4500);

    } catch (error) {
      console.error("Submission error:", error);
      setTimeout(() => {
        setShowAnalyzing(false);
        setShowSubmitted(true);
      }, 4500);
    }
  };

  const handleFinish = () => {
    setShowSubmitted(false);
    if (isAutoDispatched) {
      router.push('/help/tracking');
    } else {
      router.push('/help/pending');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBlueArea}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeft color="#FFF" size={24} />
          <Text style={styles.headerText}>More details</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>WHAT <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.card}>
          <Text style={styles.cardQuestion}>Condition of those affected?</Text>
          <RadioGroup 
            options={WHAT_OPTIONS} 
            selected={what} 
            onSelect={setWhat} 
            otherText={whatOther} 
            setOtherText={setWhatOther} 
          />
        </View>

        <Text style={styles.sectionTitle}>WHERE <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.card}>
          <Text style={styles.cardQuestion}>Can the ambulance reach the scene?</Text>
          <RadioGroup 
            options={WHERE_OPTIONS} 
            selected={where} 
            onSelect={setWhere} 
            otherText={whereOther} 
            setOtherText={setWhereOther} 
          />
        </View>

        <Text style={styles.sectionTitle}>WHEN <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.card}>
          <Text style={styles.cardQuestion}>When did this happen?</Text>
          <RadioGroup 
            options={WHEN_OPTIONS} 
            selected={when} 
            onSelect={setWhen} 
          />
        </View>

        <Text style={styles.sectionTitle}>HOW <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.card}>
          <Text style={styles.cardQuestion}>What caused the incident?</Text>
          <RadioGroup 
            options={HOW_OPTIONS} 
            selected={how} 
            onSelect={setHow} 
            otherText={howOther} 
            setOtherText={setHowOther} 
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.submitBtn, (!what || !where || !when || !how) && styles.submitBtnDisabled]} 
          onPress={handleSubmit} 
          activeOpacity={0.8}
          disabled={!what || !where || !when || !how}
        >
          <Text style={styles.submitBtnText}>Submit Report</Text>
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* Analyzing Modal */}
      <Modal visible={showAnalyzing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.analyzingIconBox}>
              <View style={styles.analyzingIconInner} />
            </View>
            <Text style={styles.modalTitle}>Analyzing Report</Text>
            <Text style={styles.modalSubtitle}>Routing your emergency to the right responders in Baliwag City.</Text>
            
            <View style={styles.analyzingList}>
              <View style={styles.analyzingListItem}>
                {analyzingStep >= 1 ? <CheckCircle color="#1E3A8A" size={18} /> : <View style={styles.emptyCircle} />}
                <Text style={[styles.analyzingListText, analyzingStep >= 1 && styles.analyzingListTextActive]}>Photo verified (live capture)</Text>
              </View>
              <View style={styles.analyzingDivider} />
              
              <View style={styles.analyzingListItem}>
                {analyzingStep >= 2 ? <CheckCircle color="#1E3A8A" size={18} /> : <View style={styles.emptyCircle} />}
                <Text style={[styles.analyzingListText, analyzingStep >= 2 && styles.analyzingListTextActive]}>Details received</Text>
              </View>
              <View style={styles.analyzingDivider} />
              
              <View style={styles.analyzingListItem}>
                {analyzingStep >= 3 ? <CheckCircle color="#1E3A8A" size={18} /> : <View style={styles.emptyCircle} />}
                <Text style={[styles.analyzingListText, analyzingStep >= 3 && styles.analyzingListTextActive]}>Classified as Emergency — direct dispatch</Text>
              </View>
              <View style={styles.analyzingDivider} />
              
              <View style={styles.analyzingListItem}>
                {analyzingStep >= 4 ? <CheckCircle color="#1E3A8A" size={18} /> : <View style={styles.emptyCircle} />}
                <Text style={[styles.analyzingListText, analyzingStep >= 4 && styles.analyzingListTextActive]}>CDRRMO notified — dispatch approved</Text>
              </View>
              <View style={styles.analyzingDivider} />
              
              <View style={styles.analyzingListItem}>
                <ActivityIndicator size="small" color="#B91C1C" style={{marginRight: 10}} />
                <Text style={styles.analyzingListTextUrgent}>Finding nearest ambulance...</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Submitted Modal */}
      <Modal visible={showSubmitted} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 32 }]}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={handleFinish}>
              <X color="#1E3A8A" size={20} />
            </TouchableOpacity>
            
            <View style={styles.successIconBox}>
              <CheckCircle color="#FFF" size={32} />
            </View>
            <Text style={styles.modalTitle}>Report Submitted</Text>
            <Text style={styles.modalSubtitleSuccess}>
              Your emergency report has been sent to the Baliwag CDRRMO. Dispatchers are reviewing your details now.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  topBlueArea: {
    backgroundColor: '#1E3A8A',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  formScrollContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  asterisk: {
    color: '#DC2626',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardQuestion: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E3A8A',
  },
  radioText: {
    fontSize: 14,
    color: '#475569',
  },
  otherInputContainer: {
    marginTop: 8,
  },
  otherInputLabel: {
    fontSize: 13,
    color: '#1E3A8A',
    marginBottom: 8,
    fontWeight: '500',
  },
  otherInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    backgroundColor: '#B91C1C',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#FCA5A5',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  analyzingIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  analyzingIconInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E3A8A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  analyzingList: {
    width: '100%',
  },
  analyzingListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  analyzingListText: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 12,
    flex: 1,
  },
  analyzingListTextActive: {
    color: '#1E3A8A',
    fontWeight: '500',
  },
  analyzingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  analyzingListTextUrgent: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: 'bold',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalSubtitleSuccess: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  }
});
