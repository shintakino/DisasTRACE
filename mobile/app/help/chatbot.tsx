import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, CheckCircle2, ChevronLeft, MapPin, Send, ShieldAlert } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { uploadIncidentPhoto } from '../../lib/storage';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

const TYPES = ['Medical Emergency', 'Vehicular Collision', 'Fire Emergency', 'Structural Failure', 'Flood/Water', 'Unknown Cause'] as const;
const PEOPLE = ['None', '1-2 Persons', '3-5 Persons', '6+ Persons'] as const;
const CONDITIONS = ['Conscious and stable', 'Conscious and unstable', 'Unconscious / critical', 'No injuries reported', 'Unknown / cannot assess'];

export default function EmergencyChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isGuest = params.mode === 'guest';
  const [step, setStep] = useState(0);
  const [contactNumber, setContactNumber] = useState('');
  const [nature, setNature] = useState<'EMERGENCY' | 'NON-EMERGENCY'>('EMERGENCY');
  const [incidentType, setIncidentType] = useState<typeof TYPES[number] | null>(null);
  const [people, setPeople] = useState<typeof PEOPLE[number] | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = useMemo(() => [
    'What is the best number for PACC to contact you?',
    'Is this an emergency, and what happened?',
    'How many people are affected?',
    people === 'None' ? 'What is the condition at the scene?' : 'What is the condition of the victim or victims?',
    'Please share your GPS location and tell us the exact place or landmark.',
    'Do you have a photo or evidence? This is optional.',
  ], [people]);

  const captureLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission was not granted.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    } catch (error) {
      Alert.alert('Location needed', error instanceof Error ? error.message : 'Unable to get your GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const chooseEvidence = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera unavailable', 'You can submit without evidence, or allow camera access and try again.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const canContinue = () => {
    if (step === 0) return contactNumber.trim().length >= 7;
    if (step === 1) return incidentType !== null;
    if (step === 2) return people !== null;
    if (step === 3) return condition !== null;
    if (step === 4) return coordinates !== null && landmarks.trim().length >= 5;
    return true;
  };

  const submit = async () => {
    if (!incidentType || !people || !condition || !coordinates) return;
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (photoUri) {
        try {
          imageUrl = await uploadIncidentPhoto(`intake-${Date.now()}`, photoUri);
        } catch {
          Alert.alert('Evidence not uploaded', 'Your report will still be sent without the optional photo.');
        }
      }
      const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
      const payload = {
        contactNumber: contactNumber.trim(), incidentType, peopleInvolved: people,
        victimCondition: condition, landmarks: landmarks.trim(), ...coordinates,
        nature, severity: condition.includes('critical') || condition.includes('Unconscious') ? 'Critical' : nature === 'EMERGENCY' ? 'High' : 'Low', imageUrl,
      };
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiUrl}/emergency-intake/${isGuest ? 'guest' : 'registered'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to submit the report.');
      useEmergencyReportStore.setState((state) => ({ report: {
        ...state.report, id: result.request.id, requestId: result.request.requestId, incidentId: result.incident?.id,
        latitude: coordinates.latitude, longitude: coordinates.longitude, photoUri: photoUri ?? undefined,
        reporterMode: isGuest ? 'guest' : 'resident', guestAccessToken: result.guestAccessToken,
        triageClassification: result.request.triageClassification,
      }}));
      router.replace((result.autoDispatched ? '/help/response-status' : '/help/pending') as any);
    } catch (error) {
      Alert.alert('Report not sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><ChevronLeft color="#FFF" size={26} /></TouchableOpacity>
        <View><Text style={styles.headerTitle}>Emergency Chatbot</Text><Text style={styles.headerSubtitle}>{isGuest ? 'Guest report — no account needed' : 'Guided emergency report'}</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.botRow}><ShieldAlert color="#EF4444" size={22} /><Text style={styles.botText}>{questions[step]}</Text></View>
        <Text style={styles.hint}>Step {step + 1} of {questions.length}</Text>
        <View style={styles.card}>
          {step === 0 && <TextInput value={contactNumber} onChangeText={setContactNumber} placeholder="e.g. 0917 123 4567" keyboardType="phone-pad" style={styles.input} />}
          {step === 1 && <><View style={styles.choiceRow}>{(['EMERGENCY', 'NON-EMERGENCY'] as const).map((option) => <Choice key={option} label={option === 'EMERGENCY' ? 'Emergency' : 'Non-emergency'} selected={nature === option} onPress={() => setNature(option)} />)}</View><View style={styles.choices}>{TYPES.map((type) => <Choice key={type} label={type} selected={incidentType === type} onPress={() => setIncidentType(type)} />)}</View></>}
          {step === 2 && <View style={styles.choices}>{PEOPLE.map((value) => <Choice key={value} label={value} selected={people === value} onPress={() => setPeople(value)} />)}</View>}
          {step === 3 && <View style={styles.choices}>{CONDITIONS.map((value) => <Choice key={value} label={value} selected={condition === value} onPress={() => setCondition(value)} />)}</View>}
          {step === 4 && <><TouchableOpacity style={styles.locationButton} onPress={captureLocation} disabled={isLocating}>{isLocating ? <ActivityIndicator color="#FFF" /> : <><MapPin color="#FFF" size={18} /><Text style={styles.locationButtonText}>{coordinates ? 'GPS location captured' : 'Share GPS location'}</Text></>}</TouchableOpacity>{coordinates && <Text style={styles.coordinates}>{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</Text>}<TextInput value={landmarks} onChangeText={setLandmarks} placeholder="Building, street, barangay, or nearest landmark" multiline style={[styles.input, styles.multiline]} /></>}
          {step === 5 && <><TouchableOpacity style={styles.evidenceButton} onPress={chooseEvidence}><Camera color="#1E3A8A" size={20} /><Text style={styles.evidenceText}>{photoUri ? 'Retake evidence photo' : 'Add photo/evidence'}</Text></TouchableOpacity>{photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}<Text style={styles.optional}>You can skip this step. Evidence supports verification but never delays emergency submission.</Text></>}
        </View>
        <View style={styles.actions}>{step > 0 && <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}><Text style={styles.backText}>Back</Text></TouchableOpacity>}<TouchableOpacity style={[styles.nextButton, !canContinue() && styles.disabled]} disabled={!canContinue() || isSubmitting} onPress={step === questions.length - 1 ? submit : () => setStep(step + 1)}>{isSubmitting ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.nextText}>{step === questions.length - 1 ? 'Send report' : 'Continue'}</Text>{step === questions.length - 1 && <Send color="#FFF" size={16} />}</>}</TouchableOpacity></View>
      </ScrollView>
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <TouchableOpacity style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}><CheckCircle2 size={18} color={selected ? '#FFF' : '#1E3A8A'} /><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#F3F4F6' }, header: { backgroundColor: '#1E3A8A', paddingTop: 58, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', gap: 14, alignItems: 'center' }, headerTitle: { color: '#FFF', fontWeight: '800', fontSize: 21 }, headerSubtitle: { color: '#DBEAFE', marginTop: 2, fontSize: 12 }, content: { padding: 20, flexGrow: 1 }, botRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 }, botText: { flex: 1, color: '#0F172A', fontSize: 18, fontWeight: '700', lineHeight: 26 }, hint: { color: '#64748B', fontSize: 12, marginBottom: 18 }, card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, input: { borderColor: '#CBD5E1', borderWidth: 1, borderRadius: 8, color: '#0F172A', padding: 14, fontSize: 15 }, multiline: { minHeight: 92, marginTop: 14, textAlignVertical: 'top' }, choiceRow: { flexDirection: 'row', gap: 8, marginBottom: 14 }, choices: { gap: 9 }, choice: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }, choiceSelected: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }, choiceText: { color: '#1E3A8A', fontWeight: '700', flex: 1 }, choiceTextSelected: { color: '#FFF' }, locationButton: { backgroundColor: '#1E3A8A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center' }, locationButtonText: { color: '#FFF', fontWeight: '700' }, coordinates: { color: '#15803D', fontWeight: '700', textAlign: 'center', marginTop: 10 }, evidenceButton: { borderWidth: 1, borderColor: '#1E3A8A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'center', gap: 8 }, evidenceText: { color: '#1E3A8A', fontWeight: '700' }, preview: { width: '100%', height: 180, borderRadius: 8, marginTop: 14 }, optional: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 14 }, actions: { flexDirection: 'row', gap: 10, marginTop: 'auto', paddingTop: 24 }, backButton: { borderColor: '#1E3A8A', borderWidth: 1, borderRadius: 8, padding: 15, alignItems: 'center', width: 90 }, backText: { color: '#1E3A8A', fontWeight: '700' }, nextButton: { backgroundColor: '#EF4444', borderRadius: 8, padding: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, flex: 1 }, disabled: { opacity: 0.45 }, nextText: { color: '#FFF', fontWeight: '800', fontSize: 16 } });
