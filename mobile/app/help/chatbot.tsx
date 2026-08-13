import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, CheckCircle2, ChevronLeft, MapPin, Navigation, Send, ShieldAlert, UserRound } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { uploadEmergencyEvidence } from '../../lib/storage';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

const INCIDENTS = [
  { value: 'Vehicular Collision', label: 'Vehicular Accident', symbol: '🚗' },
  { value: 'Fire Emergency', label: 'Fire Emergency', symbol: '🔥' },
  { value: 'Medical Emergency', label: 'Medical Emergency', symbol: '✚' },
  { value: 'Structural Failure', label: 'Structural Failure', symbol: '⚠' },
  { value: 'Flood/Water', label: 'Flood / Water', symbol: '≈' },
  { value: 'Unknown Cause', label: 'Other / Unknown', symbol: '?' },
] as const;

const CONDITIONS = ['Conscious and stable', 'Conscious and unstable', 'Unconscious / critical', 'No injuries reported', 'Unknown / cannot assess'] as const;
const STEPS = ['Incident', 'Contact', 'Location', 'Details', 'Condition', 'Evidence', 'Review'];

type IncidentType = typeof INCIDENTS[number]['value'];
export default function EmergencyChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isGuest = params.mode === 'guest';
  const activeSteps = isGuest ? STEPS : STEPS.filter((label) => label !== 'Contact');
  const [step, setStep] = useState(0);
  const [contactNumber, setContactNumber] = useState('');
  const [nature, setNature] = useState<'EMERGENCY' | 'NON-EMERGENCY'>('EMERGENCY');
  const [incidentType, setIncidentType] = useState<IncidentType | null>(null);
  const [peopleCount, setPeopleCount] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionError, setLocationPermissionError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialLocationRequested = useRef(false);
  const intakeStep = isGuest ? step : step === 0 ? 0 : step + 1;

  const incidentLabel = useMemo(
    () => INCIDENTS.find((incident) => incident.value === incidentType)?.label ?? 'Not selected',
    [incidentType],
  );

  const prompt = useMemo(() => {
    if (intakeStep === 0) return 'What happened? Please choose the incident type.';
    if (intakeStep === 1) return 'What is the best contact number for PACC to reach you?';
    if (intakeStep === 2) return 'Where is this happening? Your current GPS is captured automatically; add a nearby landmark responders can recognize.';
    if (intakeStep === 3) return 'How many people are affected? Enter the exact number.';
    if (intakeStep === 4) return 'What is the condition of the victim or victims?';
    if (intakeStep === 5) return 'Please add a photo or evidence. This is required for this report.';
    return 'Here is the summary of your report. Please confirm the details.';
  }, [intakeStep]);

  const hasValidContactNumber = () => /^(?:\+63|0)9\d{9}$/.test(contactNumber.replace(/[\s()-]/g, ''));
  const hasValidPeopleCount = () => /^\d{1,3}$/.test(peopleCount) && Number(peopleCount) >= 1 && Number(peopleCount) <= 999;
  const isWithinBaliwag = coordinates !== null && coordinates.latitude >= 14.9 && coordinates.latitude <= 15.05 && coordinates.longitude >= 120.8 && coordinates.longitude <= 121;

  const captureLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required to send this emergency report. Enable it in Settings, then try again.');
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setLocationPermissionError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to get your GPS location.';
      setLocationPermissionError(message);
      Alert.alert('Location needed', message);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (initialLocationRequested.current) return;
    initialLocationRequested.current = true;
    void captureLocation();
  }, [isGuest]);

  const captureEvidence = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Evidence permission needed', 'Allow access so you can attach the required photo/evidence.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setEvidenceError(null);
    }
  };

  const chooseEvidence = () => {
    Alert.alert('Add required evidence', 'Choose how to attach a clear photo of the incident or supporting evidence.', [
      { text: 'Take photo', onPress: () => void captureEvidence('camera') },
      { text: 'Choose photo', onPress: () => void captureEvidence('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const canContinue = () => {
    if (intakeStep === 0) return incidentType !== null;
    if (intakeStep === 1) return hasValidContactNumber();
    if (intakeStep === 2) return coordinates !== null && landmarks.trim().length >= 5;
    if (intakeStep === 3) return hasValidPeopleCount();
    if (intakeStep === 4) return condition !== null;
    if (intakeStep === 5) return photoUri !== null;
    return true;
  };

  const submit = async () => {
    if (!incidentType || (isGuest && !hasValidContactNumber()) || !hasValidPeopleCount() || !condition || !coordinates || !photoUri || landmarks.trim().length < 5) {
      Alert.alert('Complete required details', `Check the incident, ${isGuest ? 'valid mobile number, ' : ''}exact location, people count, condition, and required evidence before submitting.`);
      return;
    }
    setIsSubmitting(true);
    try {
      let imageUrl: string;
      const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
      try {
        imageUrl = await uploadEmergencyEvidence(apiUrl, photoUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The photo/evidence could not be uploaded.';
        setEvidenceError(message);
        Alert.alert('Evidence upload failed', `${message} Please try again or choose another photo.`);
        return;
      }
      const payload = {
        ...(isGuest ? { contactNumber: contactNumber.trim() } : {}),
        incidentType,
        peopleInvolved: Number(peopleCount),
        victimCondition: condition,
        landmarks: landmarks.trim(),
        ...coordinates,
        nature,
        severity: condition.includes('critical') || condition.includes('Unconscious') ? 'Critical' : nature === 'EMERGENCY' ? 'High' : 'Low',
        imageUrl,
      };
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${apiUrl}/emergency-intake/${isGuest ? 'guest' : 'registered'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to submit the report.');

      useEmergencyReportStore.setState((state) => ({ report: {
        ...state.report,
        id: result.request.id,
        requestId: result.request.requestId,
        incidentId: result.incident?.id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        photoUri: photoUri ?? undefined,
        reporterMode: isGuest ? 'guest' : 'resident',
        guestAccessToken: result.guestAccessToken,
        triageClassification: result.request.triageClassification,
      }}));
      router.replace(result.autoDispatched ? '/help/response-status' : '/help/pending');
    } catch (error) {
      Alert.alert('Report not sent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (intakeStep === 0) {
      return <>
        <View style={styles.natureRow}>
          {(['EMERGENCY', 'NON-EMERGENCY'] as const).map((option) => (
            <TouchableOpacity key={option} style={[styles.natureChip, nature === option && styles.natureChipActive]} onPress={() => setNature(option)}>
              <Text style={[styles.natureText, nature === option && styles.natureTextActive]}>{option === 'EMERGENCY' ? 'Emergency' : 'Non-emergency'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.incidentGrid}>
          {INCIDENTS.map((incident) => (
            <TouchableOpacity key={incident.value} style={[styles.incidentCard, incidentType === incident.value && styles.incidentCardSelected]} onPress={() => setIncidentType(incident.value)}>
              <Text style={styles.incidentSymbol}>{incident.symbol}</Text>
              <Text style={[styles.incidentText, incidentType === incident.value && styles.incidentTextSelected]}>{incident.label}</Text>
              {incidentType === incident.value && <CheckCircle2 color="#FFFFFF" size={17} />}
            </TouchableOpacity>
          ))}
        </View>
      </>;
    }
    if (intakeStep === 1) return <><TextInput value={contactNumber} onChangeText={setContactNumber} placeholder="e.g. 0917 123 4567" keyboardType="phone-pad" maxLength={16} style={[styles.textInput, contactNumber.length > 0 && !hasValidContactNumber() && styles.inputInvalid]} /><Text style={contactNumber.length > 0 && !hasValidContactNumber() ? styles.errorText : styles.fieldHint}>{contactNumber.length > 0 && !hasValidContactNumber() ? 'Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.' : 'Use a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.'}</Text></>;
    if (intakeStep === 2) return <>
      <TouchableOpacity style={styles.locationButton} onPress={captureLocation} disabled={isLocating}>
        {isLocating ? <ActivityIndicator color="#FFFFFF" /> : <><Navigation color="#FFFFFF" size={18} /><Text style={styles.locationButtonText}>{coordinates ? 'Update GPS location' : 'Get current GPS location'}</Text></>}
      </TouchableOpacity>
      {locationPermissionError && <Text style={styles.errorText}>{locationPermissionError}</Text>}
      {coordinates && <View style={styles.locationCard}><MapPin color="#EF4444" size={24} /><View style={styles.locationCopy}><Text style={styles.locationTitle}>Location captured</Text><Text style={styles.locationCoords}>{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</Text></View><CheckCircle2 color={isWithinBaliwag ? '#22C55E' : '#F97316'} size={19} /></View>}
      {coordinates && !isWithinBaliwag && <Text style={styles.warningText}>This GPS point is outside the Baliwag service area. PACC will review the report for coordination.</Text>}
      <TextInput value={landmarks} onChangeText={setLandmarks} placeholder="Nearest landmark, building, shop, street sign, or barangay" multiline style={[styles.textInput, styles.landmarkInput, landmarks.length > 0 && landmarks.trim().length < 5 && styles.inputInvalid]} />
      <Text style={landmarks.length > 0 && landmarks.trim().length < 5 ? styles.errorText : styles.fieldHint}>{landmarks.length > 0 && landmarks.trim().length < 5 ? 'Enter at least 5 characters so responders can find you.' : 'Add a nearby landmark or visible reference. A full address is not required.'}</Text>
    </>;
    if (intakeStep === 3) return <><TextInput value={peopleCount} onChangeText={(value) => setPeopleCount(value.replace(/\D/g, '').slice(0, 3))} placeholder="e.g. 2" keyboardType="number-pad" style={[styles.textInput, peopleCount.length > 0 && !hasValidPeopleCount() && styles.inputInvalid]} /><Text style={peopleCount.length > 0 && !hasValidPeopleCount() ? styles.errorText : styles.fieldHint}>{peopleCount.length > 0 && !hasValidPeopleCount() ? 'Use a whole number from 1 to 999.' : 'Enter a whole number from 1 to 999.'}</Text></>;
    if (intakeStep === 4) return <View style={styles.optionList}>{CONDITIONS.map((value) => <OptionButton key={value} label={value} selected={condition === value} onPress={() => setCondition(value)} />)}</View>;
    if (intakeStep === 5) return <>
      <TouchableOpacity style={[styles.evidenceButton, evidenceError && styles.evidenceInvalid]} onPress={chooseEvidence}><Camera color="#EF4444" size={21} /><Text style={styles.evidenceText}>{photoUri ? 'Replace photo / evidence' : 'Add photo / evidence'}</Text></TouchableOpacity>
      {photoUri && <Image source={{ uri: photoUri }} style={styles.preview} />}
      <Text style={styles.requiredText}>A clear photo or evidence is required before the report can be submitted.</Text>
      {evidenceError && <Text style={styles.errorText}>{evidenceError}</Text>}
    </>;
    return <View style={styles.summaryCard}>
      <SummaryRow icon="⚠" label="Nature of Call" value={nature === 'EMERGENCY' ? 'Emergency' : 'Non-emergency'} />
      <SummaryRow icon="🚗" label="Incident Type" value={incidentLabel} />
      <SummaryRow icon="⌖" label="Location" value={landmarks} detail={coordinates ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : undefined} />
      <SummaryRow icon="♟" label="People Affected" value={peopleCount ? `${peopleCount} ${Number(peopleCount) === 1 ? 'person' : 'people'}` : 'Not entered'} />
      <SummaryRow icon="♥" label="Condition" value={condition ?? 'Not selected'} />
      <SummaryRow icon="▣" label="Photo / Evidence" value={photoUri ? '1 photo attached' : 'No photo attached'} />
    </View>;
  };

  return <SafeAreaView style={styles.page}>
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}><ChevronLeft color="#1E293B" size={22} /></TouchableOpacity>
      <View style={styles.botIdentity}><View style={styles.botBadge}><ShieldAlert color="#FFFFFF" size={18} /></View><View><Text style={styles.botName}>DisasTRACE Emergency Bot</Text><Text style={styles.botSubtitle}>{isGuest ? 'Guest report — no account needed' : 'Guided emergency report'}</Text></View></View>
    </View>

    <View style={styles.progressTrack}>{activeSteps.map((label, index) => <View key={label} style={styles.progressItem}><View style={[styles.progressDot, index <= step && styles.progressDotActive]}><Text style={[styles.progressNumber, index <= step && styles.progressNumberActive]}>{index + 1}</Text></View>{index < activeSteps.length - 1 && <View style={[styles.progressLine, index < step && styles.progressLineActive]} />}</View>)}</View>

    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.botMessage}><View style={styles.messageIcon}><ShieldAlert color="#FFFFFF" size={16} /></View><View style={styles.botBubble}><Text style={styles.botBubbleText}>{prompt}</Text></View></View>
      {step > 0 && <View style={styles.answerMessage}><View style={styles.answerBubble}><Text style={styles.answerLabel}>Your response</Text><Text style={styles.answerValue}>{intakeStep === 1 ? (contactNumber || 'Enter a valid mobile number') : intakeStep === 2 ? (landmarks || 'Add the exact location') : intakeStep === 3 ? (peopleCount ? `${peopleCount} ${Number(peopleCount) === 1 ? 'person' : 'people'}` : 'Enter the number of people') : intakeStep === 4 ? (condition ?? 'Select one') : intakeStep === 5 ? (photoUri ? 'Photo attached' : 'Photo/evidence required') : 'Please check the summary below'}</Text></View><View style={styles.userIcon}><UserRound color="#FFFFFF" size={16} /></View></View>}
      <View style={styles.inputCard}>{renderStepContent()}</View>
    </ScrollView>

    <View style={styles.footer}>
      {step > 0 && <TouchableOpacity style={styles.backButton} onPress={() => setStep((current) => current - 1)} disabled={isSubmitting}><Text style={styles.backText}>Back</Text></TouchableOpacity>}
      <TouchableOpacity style={[styles.primaryButton, !canContinue() && styles.primaryDisabled]} disabled={!canContinue() || isSubmitting} onPress={step === activeSteps.length - 1 ? submit : () => setStep((current) => current + 1)}>
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>{step === activeSteps.length - 1 ? 'Yes, submit report' : 'Continue'}</Text><Send color="#FFFFFF" size={17} /></>}
      </TouchableOpacity>
    </View>
  </SafeAreaView>;
}

function OptionButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.optionButton, selected && styles.optionButtonSelected]} onPress={onPress}><View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>{selected && <CheckCircle2 color="#FFFFFF" size={14} />}</View><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></TouchableOpacity>;
}

function SummaryRow({ icon, label, value, detail }: { icon: string; label: string; value: string; detail?: string }) {
  return <View style={styles.summaryRow}><Text style={styles.summaryIcon}>{icon}</Text><View style={styles.summaryCopy}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text>{detail && <Text style={styles.summaryDetail}>{detail}</Text>}</View></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  botIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  botBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  botName: { color: '#0F172A', fontWeight: '800', fontSize: 14 },
  botSubtitle: { color: '#64748B', fontSize: 11, marginTop: 1 },
  progressTrack: { flexDirection: 'row', paddingHorizontal: 22, paddingVertical: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  progressNumber: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  progressNumberActive: { color: '#FFFFFF' },
  progressLine: { width: 21, height: 2, backgroundColor: '#E2E8F0' },
  progressLineActive: { backgroundColor: '#EF4444' },
  content: { padding: 18, paddingBottom: 24, flexGrow: 1 },
  botMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  messageIcon: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  botBubble: { backgroundColor: '#FFFFFF', borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', flex: 1 },
  botBubbleText: { color: '#1E293B', fontSize: 15, lineHeight: 21, fontWeight: '700' },
  answerMessage: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, maxWidth: '88%' },
  answerBubble: { backgroundColor: '#FF3B30', borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 13, paddingVertical: 10, flexShrink: 1 },
  answerLabel: { color: '#FEE2E2', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  answerValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 2 },
  userIcon: { width: 29, height: 29, borderRadius: 15, backgroundColor: '#64748B', alignItems: 'center', justifyContent: 'center' },
  inputCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  natureRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  natureChip: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  natureChipActive: { backgroundColor: '#FEE2E2' },
  natureText: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  natureTextActive: { color: '#DC2626' },
  incidentGrid: { gap: 9 },
  incidentCard: { minHeight: 49, borderWidth: 1, borderColor: '#F1E5E5', backgroundColor: '#FFF8F7', borderRadius: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  incidentCardSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  incidentSymbol: { fontSize: 18, width: 25, textAlign: 'center' },
  incidentText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', flex: 1 },
  incidentTextSelected: { color: '#FFFFFF' },
  textInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, color: '#0F172A', paddingHorizontal: 13, paddingVertical: 13, fontSize: 15, backgroundColor: '#FFFFFF' },
  inputInvalid: { borderColor: '#EF4444', backgroundColor: '#FFF7F7' },
  landmarkInput: { minHeight: 88, marginTop: 12, textAlignVertical: 'top' },
  locationButton: { backgroundColor: '#FF3B30', borderRadius: 9, paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  locationButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 12 },
  locationCopy: { flex: 1 },
  locationTitle: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
  locationCoords: { color: '#64748B', fontSize: 11, marginTop: 2 },
  optionList: { gap: 9 },
  optionButton: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 9, minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionButtonSelected: { borderColor: '#FF3B30', backgroundColor: '#FFF1F0' },
  optionRadio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  optionRadioSelected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  optionText: { color: '#334155', fontSize: 13, fontWeight: '700', flex: 1 },
  optionTextSelected: { color: '#B91C1C' },
  evidenceButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#FDA4AF', backgroundColor: '#FFF8F7', borderRadius: 10, minHeight: 74, alignItems: 'center', justifyContent: 'center', gap: 6 },
  evidenceInvalid: { borderColor: '#EF4444', backgroundColor: '#FFF1F2' },
  evidenceText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },
  preview: { width: '100%', height: 190, borderRadius: 10, marginTop: 12 },
  requiredText: { color: '#B91C1C', fontSize: 11, lineHeight: 16, marginTop: 12, fontWeight: '700' },
  fieldHint: { color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 8 },
  errorText: { color: '#DC2626', fontSize: 11, lineHeight: 16, marginTop: 8, fontWeight: '700' },
  warningText: { color: '#C2410C', fontSize: 11, lineHeight: 16, marginTop: 8, fontWeight: '700' },
  summaryCard: { backgroundColor: '#FFF8F7', borderRadius: 10, padding: 12, gap: 13 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryIcon: { fontSize: 17, width: 22, textAlign: 'center' },
  summaryCopy: { flex: 1 },
  summaryLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryValue: { color: '#0F172A', fontSize: 13, fontWeight: '800', marginTop: 1 },
  summaryDetail: { color: '#64748B', fontSize: 11, marginTop: 1 },
  footer: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', gap: 10 },
  backButton: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, alignItems: 'center', justifyContent: 'center', minWidth: 82, paddingHorizontal: 14 },
  backText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  primaryButton: { flex: 1, borderRadius: 9, backgroundColor: '#FF3B30', minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryDisabled: { opacity: 0.42 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
