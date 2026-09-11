import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { isMockedLocation, MOCK_LOCATION_MESSAGE } from '../../lib/location-integrity';
import { formatBaliwagLocation, resolveBaliwagLocation } from '../../lib/baliwag-location';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Navigation,
  Send,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react-native';
import { uploadEmergencyEvidence } from '../../lib/storage';
import { syncChatbotReportToEmergencyStore } from '../../lib/chatbot-report-bridge';
import { supabase } from '../../lib/supabase';
import {
  CHATBOT_CONDITIONS,
  CHATBOT_INCIDENT_TYPES,
  deriveChatbotNature,
  deriveMobileIntakePhase,
  getNextMissingSlot,
  isObviouslySyntheticGuestPhone,
  isReportProgressVisible,
  isValidGuestPhone,
  isWithinBaliwag,
  parseExactPeopleInput,
  type ChatbotDraft,
  type ChatbotReporterMode,
  type ChatbotSlot,
} from '../../lib/chatbot-contracts';
import { askChatbot, submitChatbotReport } from '../../services/chatbot-api';
import { useChatbotStore } from '../../store/use-chatbot-store';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

const API_URL = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
const NAVY = '#1E3A8A';
const BLUE = '#3B82F6';
const WELCOME = 'Hi, I’m the DisasTRACE assistant. I can answer approved safety and Baliwag CDRRMO questions, or guide you through an incident report.';

type ChatMessage = { id: string; role: 'bot' | 'user'; text: string };
type LanguageStyle = 'en' | 'fil' | 'taglish';

const PHASE_LABELS = ['Start', 'Location & contact', 'Incident details', 'Review', 'Submit'] as const;

function parseExifCoordinate(value: unknown, reference: unknown): number | undefined {
  const raw = Array.isArray(value)
    ? value.reduce<number>((total, part, index) => total + (Number(part) / (index === 0 ? 1 : index === 1 ? 60 : 3600)), 0)
    : Number(value);
  if (!Number.isFinite(raw) || raw < 0) return undefined;
  const direction = typeof reference === 'string' ? reference.toUpperCase() : '';
  return direction === 'S' || direction === 'W' ? -raw : raw;
}

function getPhotoExifCoordinates(exif: Record<string, unknown> | null | undefined) {
  if (!exif) return undefined;
  const latitude = parseExifCoordinate(exif.GPSLatitude ?? exif.latitude, exif.GPSLatitudeRef ?? exif.latitudeRef);
  const longitude = parseExifCoordinate(exif.GPSLongitude ?? exif.longitude, exif.GPSLongitudeRef ?? exif.longitudeRef);
  if (latitude === undefined || longitude === undefined || latitude > 90 || longitude > 180) return undefined;
  return { latitude, longitude };
}

function promptFor(slot: ChatbotSlot, reporterMode: ChatbotReporterMode, languageStyle: LanguageStyle = 'en'): string {
  const english: Record<ChatbotSlot, string> = {
    evidence: 'Please take clear photo evidence when it is safe. Evidence is required before sending a report.',
    incidentType: 'What happened? Choose the existing incident type that best fits.',
    contactNumber: 'What Philippine mobile number can PACC use to reach you?',
    location: reporterMode === 'guest'
      ? 'I will use your GPS. Please also send a nearby landmark responders can recognize.'
      : 'I will use your GPS. You may add a nearby landmark if it helps responders.',
    peopleInvolved: 'How many people are involved? Type and send one exact whole number from 1 to 999, not a range.',
    victimCondition: 'What is the victim’s condition? Choose the closest option.',
    review: 'Review every report detail below. You can edit any field before explicitly submitting it.',
  };
  if (languageStyle === 'en') return english[slot];
  const filipino: Record<ChatbotSlot, string> = {
    evidence: 'Kumuha ng malinaw na litrato kung ligtas gawin. Kailangan ang ebidensiya bago maipadala ang ulat.',
    incidentType: 'Ano ang nangyari? Pumili ng isang kasalukuyang uri ng insidente.',
    contactNumber: 'Anong Philippine mobile number ang maaaring tawagan ng PACC?',
    location: reporterMode === 'guest' ? 'Gagamitin ko ang GPS. Magpadala rin ng kalapit na palatandaan.' : 'Gagamitin ko ang GPS. Opsyonal ang kalapit na palatandaan.',
    peopleInvolved: 'Ilang tao ang sangkot? Magpadala ng isang eksaktong buong bilang mula 1 hanggang 999, hindi range.',
    victimCondition: 'Ano ang kalagayan ng biktima? Piliin ang pinakamalapit na sagot.',
    review: 'Suriin ang bawat detalye. Maaari mong i-edit ang mga ito bago ipadala.',
  };
  if (languageStyle === 'fil') return filipino[slot];
  return `${filipino[slot]} You can use the controls below.`;
}

function makeMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return { id: `${Date.now()}-${Math.random()}`, role, text };
}

export default function EmergencyChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const requestedMode: ChatbotReporterMode = params.mode === 'guest' ? 'guest' : 'registered';
  const {
    lifecycle,
    reporterMode,
    submissionId,
    draft,
    activeReport,
    editTarget,
    hasHydrated,
    startDraft,
    updateDraft,
    setEditTarget,
    markSubmitting,
    restoreDraftAfterFailure,
    markSubmitted,
    discardDraft,
  } = useChatbotStore();
  const [messages, setMessages] = useState<ChatMessage[]>([makeMessage('bot', WELCOME)]);
  const [composer, setComposer] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [pendingReportIntent, setPendingReportIntent] = useState<Partial<ChatbotDraft> | null>(null);
  const [languageStyle, setLanguageStyle] = useState<LanguageStyle>('en');
  const [waiting, setWaiting] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [officialLocationLabel, setOfficialLocationLabel] = useState<string | null>(null);
  const [actorReady, setActorReady] = useState(false);
  const submissionLock = useRef(false);
  const requestedLocation = useRef(false);
  const restoredPromptShown = useRef(false);
  const scrollRef = useRef<ScrollView>(null);

  const activeSlot = useMemo(
    () => editTarget ?? getNextMissingSlot(draft, reporterMode),
    [draft, editTarget, reporterMode],
  );
  const phase = deriveMobileIntakePhase(draft, reporterMode, lifecycle);
  const progressVisible = isReportProgressVisible(lifecycle);

  const addMessage = (role: ChatMessage['role'], text: string) => {
    setMessages((current) => [...current, makeMessage(role, text)]);
  };

  useEffect(() => {
    if (!hasHydrated) return;
    let mounted = true;
    const verifyActor = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const expectedOwnerId = requestedMode === 'guest' ? 'guest' : session?.user.id;
      if (!expectedOwnerId) {
        useChatbotStore.getState().clearReportToIdle();
        useEmergencyReportStore.getState().resetReport();
        router.replace('/(auth)/sign-in' as never);
        return;
      }
      const current = useChatbotStore.getState();
      if (current.lifecycle !== 'IDLE' && (current.reporterMode !== requestedMode || current.ownerId !== expectedOwnerId)) {
        current.clearReportToIdle();
        useEmergencyReportStore.getState().resetReport();
      }
      useChatbotStore.getState().setActor(requestedMode, expectedOwnerId);
      if (mounted) setActorReady(true);
    };
    void verifyActor();
    return () => { mounted = false; };
  }, [hasHydrated, requestedMode, router]);

  useEffect(() => {
    if (!actorReady) return;
    if (activeReport) {
      if (submissionId) syncChatbotReportToEmergencyStore({ draft, activeReport, submissionId });
      router.replace((activeReport.hasIncident ? '/help/response-status' : '/help/chatbot-pending') as never);
    }
  }, [activeReport, actorReady, draft, router, submissionId]);

  useEffect(() => {
    if (!hasHydrated || lifecycle !== 'DRAFT' || restoredPromptShown.current) return;
    restoredPromptShown.current = true;
    addMessage('bot', `Your unfinished report draft was restored. ${promptFor(activeSlot, reporterMode, languageStyle)}`);
  }, [activeSlot, hasHydrated, languageStyle, lifecycle, reporterMode]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [activeSlot, messages]);

  const captureLocation = useCallback(async () => {
    if (capturingLocation) return;
    setCapturingLocation(true);
    setOfficialLocationLabel(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Location permission is required to submit an incident report.');
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (isMockedLocation(location)) throw new Error(MOCK_LOCATION_MESSAGE);
      const resolved = await resolveBaliwagLocation(location.coords.latitude, location.coords.longitude);
      const formatted = formatBaliwagLocation(resolved?.barangay);
      if (!formatted) throw new Error('This GPS point is outside an official Baliwag barangay boundary.');
      setOfficialLocationLabel(formatted);
      updateDraft({ latitude: location.coords.latitude, longitude: location.coords.longitude });
    } catch (error) {
      Alert.alert('Location needed', error instanceof Error ? error.message : 'Unable to capture your GPS location.');
    } finally {
      setCapturingLocation(false);
    }
  }, [capturingLocation, updateDraft]);

  useEffect(() => {
    if (draft.latitude === undefined || draft.longitude === undefined || officialLocationLabel) return;
    resolveBaliwagLocation(draft.latitude, draft.longitude)
      .then((resolved) => setOfficialLocationLabel(formatBaliwagLocation(resolved?.barangay)))
      .catch(() => setOfficialLocationLabel(null));
  }, [draft.latitude, draft.longitude, officialLocationLabel]);

  useEffect(() => {
    if (lifecycle !== 'DRAFT' || draft.latitude !== undefined || requestedLocation.current) return;
    requestedLocation.current = true;
    void captureLocation();
  }, [captureLocation, draft.latitude, lifecycle]);

  const announceNextSlot = (nextDraft: ChatbotDraft, completedEdit = false, style = languageStyle) => {
    const next = getNextMissingSlot(nextDraft, reporterMode);
    if (completedEdit) {
      setEditTarget(null);
      addMessage('bot', promptFor('review', reporterMode, style));
      return;
    }
    addMessage('bot', promptFor(next, reporterMode, style));
  };

  const completeSlot = (updates: Partial<ChatbotDraft>, confirmation: string) => {
    const nextDraft = { ...draft, ...updates };
    updateDraft(updates);
    setFieldValue('');
    addMessage('user', confirmation);
    announceNextSlot(nextDraft, Boolean(editTarget));
  };

  const beginReport = (updates: Partial<ChatbotDraft> = {}) => {
    const current = useChatbotStore.getState();
    if (current.activeReport || current.lifecycle !== 'IDLE') return;
    startDraft(updates);
    addMessage('bot', promptFor(getNextMissingSlot(updates, reporterMode), reporterMode, languageStyle));
  };

  const discardCurrentDraft = () => {
    Alert.alert(
      'Discard draft report?',
      'This draft has not been sent to PACC. Entered report details and this temporary conversation will be cleared.',
      [
        { text: 'Keep drafting', style: 'cancel' },
        {
          text: 'Discard draft',
          style: 'destructive',
          onPress: () => {
            discardDraft();
            requestedLocation.current = false;
            restoredPromptShown.current = false;
            setMessages([makeMessage('bot', `${WELCOME} Your draft was cancelled and no report was sent.`)]);
          },
        },
      ],
    );
  };

  const handleBack = () => {
    if (lifecycle === 'DRAFT' || lifecycle === 'SUBMITTING') {
      discardCurrentDraft();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace((params.returnTo || (reporterMode === 'guest' ? '/' : '/(tabs)')) as never);
  };

  const handleChatbotResponse = (message: string, response: Awaited<ReturnType<typeof askChatbot>>) => {
    const current = useChatbotStore.getState();
    setLanguageStyle(response.languageStyle);
    addMessage('bot', response.reply);
    if (response.action === 'CANCEL_DRAFT' && current.lifecycle === 'DRAFT') {
      discardCurrentDraft();
      return;
    }
    if (response.action === 'CANCEL_SUBMITTED') return;

    const updates = response.slotUpdates;
    const shouldStart = current.lifecycle === 'IDLE' && (response.shouldStartDraft || response.action === 'START_REPORT');
    if (shouldStart) {
      if (/^(start|begin|make|create)\s+(an?\s+)?(incident\s+)?report$/i.test(message.trim())) {
        startDraft(updates);
        addMessage('bot', promptFor(getNextMissingSlot(updates, reporterMode), reporterMode, response.languageStyle));
      } else {
        setPendingReportIntent(updates);
        addMessage('bot', response.languageStyle === 'en'
          ? 'Would you like to start a report using those details? Report progress will begin only after you confirm.'
          : 'Gusto mo bang magsimula ng report gamit ang mga detalyeng iyon? Magsisimula lang ang progress pagkatapos mong kumpirmahin.');
      }
      return;
    }
    if (current.lifecycle === 'DRAFT' && Object.keys(updates).length > 0) {
      const nextDraft = { ...current.draft, ...updates };
      updateDraft(updates);
      if (!response.resumePending) announceNextSlot(nextDraft, Boolean(editTarget), response.languageStyle);
    }
  };

  const sendComposer = async () => {
    const message = composer.trim();
    if (!message || waiting || lifecycle === 'SUBMITTING') return;
    setComposer('');
    addMessage('user', message);

    if (lifecycle === 'DRAFT' && activeSlot === 'peopleInvolved') {
      const exactCount = parseExactPeopleInput(message);
      if (exactCount !== null) {
        const nextDraft = { ...draft, peopleInvolved: exactCount };
        updateDraft({ peopleInvolved: exactCount });
        addMessage('bot', languageStyle === 'en'
          ? `Thanks. I recorded exactly ${exactCount} ${exactCount === 1 ? 'person' : 'people'}.`
          : `Salamat. Naitala ko ang eksaktong bilang na ${exactCount} ${exactCount === 1 ? 'tao' : 'katao'}.`);
        announceNextSlot(nextDraft, Boolean(editTarget));
        return;
      }
      const looksLikeCount = /^[\d\s.,+–—-]+$/.test(message)
        || /\b(one|two|three|four|five|six|seven|eight|nine|ten|isa|dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu)\b/i.test(message);
      if (looksLikeCount) {
        addMessage('bot', languageStyle === 'en'
          ? 'Please send one exact whole number from 1 to 999. I cannot use a range or decimal.'
          : 'Magpadala ng isang eksaktong buong bilang mula 1 hanggang 999. Hindi maaaring range o decimal.');
        return;
      }
    }

    setWaiting(true);
    try {
      const response = await askChatbot({
        message,
        reporterMode,
        mode: lifecycle === 'IDLE' ? 'IDLE' : 'DRAFT',
        draft,
        pendingSlot: lifecycle === 'DRAFT' ? activeSlot : undefined,
      });
      handleChatbotResponse(message, response);
    } catch (error) {
      addMessage('bot', error instanceof Error
        ? `${error.message} ${lifecycle === 'DRAFT' ? promptFor(activeSlot, reporterMode, languageStyle) : 'You can still start a report using the button below.'}`
        : 'I could not process that message.');
    } finally {
      setWaiting(false);
    }
  };

  const takeEvidence = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access so you can attach the evidence required by the current report process.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, exif: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const photoCoordinates = getPhotoExifCoordinates(asset.exif);
      completeSlot({
        photoUri: asset.uri,
        imageUrl: undefined,
        photoLatitude: photoCoordinates?.latitude,
        photoLongitude: photoCoordinates?.longitude,
      }, photoCoordinates ? 'Photo evidence attached with embedded GPS coordinates' : 'Photo evidence attached');
    }
  };

  const submitReport = async () => {
    if (submissionLock.current || lifecycle !== 'DRAFT' || activeSlot !== 'review' || !submissionId) return;
    if (!draft.photoUri || !draft.incidentType || !draft.nature || draft.latitude === undefined
      || draft.longitude === undefined || !draft.peopleInvolved || !draft.victimCondition) return;
    if (!isWithinBaliwag(draft.latitude, draft.longitude)) {
      Alert.alert('Outside service area', 'Reports can only be submitted from inside the Baliwag City service area. Update your GPS location and try again.');
      return;
    }
    if (reporterMode === 'guest' && (!isValidGuestPhone(draft.contactNumber) || (draft.landmarks?.trim().length ?? 0) < 5)) return;

    submissionLock.current = true;
    markSubmitting();
    try {
      const imageUrl = draft.imageUrl ?? await uploadEmergencyEvidence(API_URL, draft.photoUri);
      markSubmitting(imageUrl);
      const completeDraft = { ...draft, imageUrl } as Required<Pick<ChatbotDraft,
        'imageUrl' | 'incidentType' | 'nature' | 'latitude' | 'longitude' | 'peopleInvolved' | 'victimCondition'>> & ChatbotDraft;
      const result = await submitChatbotReport({ reporterMode, submissionId, draft: completeDraft });
      const report = {
        id: result.request.id,
        displayId: result.request.requestId,
        reporterMode,
        guestAccessToken: result.guestAccessToken ?? undefined,
        incidentId: result.incident?.id,
        trackingRequestId: result.request.id,
        status: result.request.status,
        responseStatus: result.incident ? 'PACC has started emergency response coordination.' : 'PACC is reviewing your report.',
        triageClassification: result.request.triageClassification,
        hasIncident: Boolean(result.incident),
        isMergedDuplicate: false,
      };
      markSubmitted(report);
      syncChatbotReportToEmergencyStore({ draft: completeDraft, activeReport: report, submissionId });
      router.replace((result.autoDispatched ? '/help/response-status' : '/help/chatbot-pending') as never);
    } catch (error) {
      restoreDraftAfterFailure();
      Alert.alert('Report not sent', error instanceof Error ? error.message : 'Your draft was kept. Please try again.');
    } finally {
      submissionLock.current = false;
    }
  };

  const renderOption = (label: string, onPress: () => void) => (
    <TouchableOpacity key={label} style={styles.option} onPress={onPress} disabled={waiting}>
      <Text style={styles.optionText}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderFieldForm = (input: {
    placeholder: string;
    keyboard?: 'default' | 'phone-pad';
    initialValue?: string;
    autoComplete?: TextInputProps['autoComplete'];
    importantForAutofill?: TextInputProps['importantForAutofill'];
    textContentType?: TextInputProps['textContentType'];
    notice?: React.ReactNode;
    onSubmit: (value: string) => void;
  }) => (
    <View style={styles.formBlock}>
      {input.notice}
      <TextInput
        value={fieldValue}
        onChangeText={setFieldValue}
        placeholder={input.placeholder}
        placeholderTextColor="#64748B"
        keyboardType={input.keyboard ?? 'default'}
        autoComplete={input.autoComplete}
        importantForAutofill={input.importantForAutofill}
        textContentType={input.textContentType}
        autoCorrect={false}
        style={styles.fieldInput}
        onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
      />
      <TouchableOpacity style={styles.primary} onPress={() => input.onSubmit(fieldValue.trim())}>
        <Send color="#FFF" size={17} />
        <Text style={styles.primaryText}>Send response</Text>
      </TouchableOpacity>
    </View>
  );

  const renderControls = () => {
    if (lifecycle === 'IDLE') {
      return (
        <View style={styles.formBlock}>
          {pendingReportIntent ? (
            <View style={styles.choiceRow}>
              <TouchableOpacity style={styles.primaryChoice} onPress={() => {
                const updates = pendingReportIntent;
                setPendingReportIntent(null);
                beginReport(updates);
              }}><Text style={styles.primaryText}>Yes, start report</Text></TouchableOpacity>
              <TouchableOpacity style={styles.neutralChoice} onPress={() => {
                setPendingReportIntent(null);
                addMessage('bot', 'No report was started. You can continue asking approved questions.');
              }}><Text style={styles.neutralChoiceText}>Not now</Text></TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={styles.primary} onPress={() => beginReport()}>
            <ShieldAlert color="#FFF" size={18} />
            <Text style={styles.primaryText}>Start incident report</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (lifecycle === 'SUBMITTING') {
      return <View style={styles.submitting}><ActivityIndicator color={NAVY} /><Text style={styles.help}>Sending this report once. Keep this screen open.</Text></View>;
    }
    if (activeSlot === 'evidence') {
      return (
        <View style={styles.formBlock}>
          <TouchableOpacity style={styles.primary} onPress={() => void takeEvidence()}>
            <Camera color="#FFF" size={18} />
            <Text style={styles.primaryText}>{draft.photoUri ? 'Retake photo evidence' : 'Take photo evidence'}</Text>
          </TouchableOpacity>
          {draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={styles.preview} alt="Selected photo evidence" /> : null}
          {draft.photoUri ? (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => completeSlot({}, 'Kept current photo evidence')}
            >
              <Text style={styles.secondaryText}>Keep current photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    if (activeSlot === 'incidentType') {
      return (
        <View style={styles.formBlock}>
          <Text style={styles.help}>The system classifies the report from the selected incident type. You do not need to choose emergency status.</Text>
          {CHATBOT_INCIDENT_TYPES.map((incidentType) => renderOption(incidentType, () => {
            completeSlot({ incidentType, nature: deriveChatbotNature(incidentType) }, incidentType);
          }))}
        </View>
      );
    }
    if (activeSlot === 'contactNumber') {
      return renderFieldForm({
        placeholder: draft.contactNumber || '0917 123 4567',
        keyboard: 'phone-pad',
        autoComplete: 'tel',
        importantForAutofill: 'noExcludeDescendants',
        textContentType: 'telephoneNumber',
        notice: (
          <View style={styles.guestSafetyNotice}>
            <Text style={styles.guestSafetyNoticeText}>
              For your safety, your exact GPS location and a protected device identifier are recorded with this report. False reports may be punishable under applicable law. Please enter an active mobile number so responders can contact you.
            </Text>
          </View>
        ),
        onSubmit: (contactNumber) => {
          if (isObviouslySyntheticGuestPhone(contactNumber)) {
            addMessage('bot', 'Please enter an active mobile number. Repeating or sequential numbers are not accepted.');
            return;
          }
          if (!isValidGuestPhone(contactNumber)) {
            addMessage('bot', 'Please enter a valid Philippine mobile number, such as 09171234567.');
            return;
          }
          completeSlot({ contactNumber }, contactNumber);
        },
      });
    }
    if (activeSlot === 'location') {
      const hasGps = draft.latitude !== undefined && draft.longitude !== undefined;
      const outsideBaliwag = hasGps && !isWithinBaliwag(draft.latitude!, draft.longitude!);
      return (
        <View style={styles.formBlock}>
          <TouchableOpacity style={styles.secondary} onPress={() => void captureLocation()} disabled={capturingLocation}>
            {capturingLocation ? <ActivityIndicator color={NAVY} /> : <Navigation color={NAVY} size={17} />}
            <Text style={styles.secondaryText}>{hasGps ? 'Update GPS location' : 'Capture GPS location'}</Text>
          </TouchableOpacity>
          {hasGps ? <Text style={styles.help}>{officialLocationLabel ? `GPS location: ${officialLocationLabel}` : 'Verifying official barangay from GPS…'}</Text> : null}
          {outsideBaliwag ? <Text style={styles.warning}>This GPS point is outside the Baliwag City service area. Capture a location inside Baliwag before continuing.</Text> : null}
          <TextInput
            value={fieldValue}
            onChangeText={setFieldValue}
            placeholder={draft.landmarks || (reporterMode === 'guest' ? 'Required nearby landmark' : 'Optional nearby landmark')}
            placeholderTextColor="#64748B"
            style={styles.fieldInput}
            autoCorrect={false}
            onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
          />
          <TouchableOpacity style={styles.primary} onPress={() => {
            const landmarks = fieldValue.trim() || draft.landmarks || '';
            if (!hasGps) {
              addMessage('bot', 'GPS location is required. Please capture it before continuing.');
              return;
            }
            if (outsideBaliwag) {
              addMessage('bot', 'This report can only be submitted from inside the Baliwag City service area. Please update your GPS location before continuing.');
              return;
            }
            if (reporterMode === 'guest' && landmarks.length < 5) {
              addMessage('bot', 'Please provide a recognizable nearby landmark using at least 5 characters.');
              return;
            }
            completeSlot({ landmarks }, landmarks || 'GPS location confirmed');
          }}>
            <Send color="#FFF" size={17} />
            <Text style={styles.primaryText}>Send location</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (activeSlot === 'peopleInvolved') {
      return (
        <View style={styles.countHint}>
          <Text style={styles.countTitle}>Send one exact count in chat</Text>
          <Text style={styles.help}>Examples: 3, three, or tatlo. Ranges such as 2–5 are not accepted.</Text>
        </View>
      );
    }
    if (activeSlot === 'victimCondition') {
      return (
        <View style={styles.formBlock}>
          {CHATBOT_CONDITIONS.map((victimCondition) => renderOption(victimCondition, () => {
            completeSlot({ victimCondition }, victimCondition);
          }))}
        </View>
      );
    }
    return (
      <View style={styles.reviewCard}>
        <ReviewRow label="Evidence" value={draft.photoUri ? 'Photo attached' : 'Missing'} onEdit={() => setEditTarget('evidence')} />
        <ReviewRow label="Nature" value={draft.nature === 'NON-EMERGENCY' ? 'Non-emergency' : 'Emergency'} onEdit={() => setEditTarget('incidentType')} />
        <ReviewRow label="Incident" value={draft.incidentType ?? 'Missing'} onEdit={() => setEditTarget('incidentType')} />
        {reporterMode === 'guest' ? <ReviewRow label="Contact" value={draft.contactNumber ?? 'Missing'} onEdit={() => setEditTarget('contactNumber')} /> : null}
        <ReviewRow label="Location" value={officialLocationLabel || 'Verified GPS location'} onEdit={() => setEditTarget('location')} />
        <ReviewRow label="People involved" value={String(draft.peopleInvolved ?? 'Missing')} onEdit={() => setEditTarget('peopleInvolved')} />
        <ReviewRow label="Condition" value={draft.victimCondition ?? 'Missing'} onEdit={() => setEditTarget('victimCondition')} />
        <TouchableOpacity style={styles.primary} onPress={() => void submitReport()}>
          <CheckCircle2 color="#FFF" size={18} />
          <Text style={styles.primaryText}>Submit report</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!hasHydrated || !actorReady) {
    return <SafeAreaView style={styles.loadingPage}><ActivityIndicator color={NAVY} size="large" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={handleBack} style={styles.iconButton}><ChevronLeft color="#1E293B" size={22} /></TouchableOpacity>
        <View style={styles.identity}>
          <View style={styles.botBadge}><ShieldAlert color="#FFF" size={17} /></View>
          <View style={styles.identityText}>
            <Text style={styles.title}>DisasTRACE Assistant</Text>
            <Text style={styles.subtitle}>{reporterMode === 'guest' ? 'Guest mode' : 'Guided reporting and safety help'}</Text>
          </View>
        </View>
        {progressVisible ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel draft report" onPress={discardCurrentDraft} disabled={waiting} style={styles.iconButton}><X color="#B91C1C" size={20} /></TouchableOpacity>
        ) : <View style={styles.iconSpacer} />}
      </View>

      {progressVisible && phase ? <Progress phase={phase} /> : null}

      <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {waiting ? <ActivityIndicator color={BLUE} /> : null}
        <View pointerEvents={waiting ? 'none' : 'auto'} style={[styles.controls, waiting && styles.disabledControls]}>{renderControls()}</View>
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={composer}
          onChangeText={setComposer}
          onSubmitEditing={() => void sendComposer()}
          editable={lifecycle !== 'SUBMITTING'}
          placeholder={lifecycle === 'DRAFT' && activeSlot === 'peopleInvolved'
            ? 'Type one exact number and send'
            : 'Ask an approved safety or DisasTRACE question'}
          placeholderTextColor="#64748B"
          style={styles.composerInput}
          onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send chat message" style={styles.sendButton} onPress={() => void sendComposer()} disabled={waiting || lifecycle === 'SUBMITTING'}>
          {waiting ? <ActivityIndicator color="#FFF" size="small" /> : <Send color="#FFF" size={18} />}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Progress({ phase }: { phase: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <View style={styles.progress}>
      <View style={styles.progressHeading}>
        <Text style={styles.progressText}>Report phase {phase} of 5</Text>
        <Text style={styles.progressLabel}>{PHASE_LABELS[phase - 1]}</Text>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${phase * 20}%` }]} /></View>
    </View>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const user = message.role === 'user';
  return (
    <View style={[styles.message, user ? styles.userMessage : styles.botMessage]}>
      {!user ? <View style={styles.avatar}><ShieldAlert color="#FFF" size={14} /></View> : null}
      <View style={[styles.bubble, user ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, user && styles.userText]}>{message.text}</Text>
      </View>
      {user ? <View style={styles.userAvatar}><UserRound color="#FFF" size={14} /></View> : null}
    </View>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewCopy}><Text style={styles.reviewLabel}>{label}</Text><Text style={styles.reviewValue}>{value}</Text></View>
      <TouchableOpacity onPress={onEdit}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  keyboardArea: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconSpacer: { width: 44 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  identityText: { flex: 1 },
  botBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 11, marginTop: 2 },
  progress: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  progressHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { color: NAVY, fontSize: 12, fontWeight: '800' },
  progressLabel: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 5, backgroundColor: '#DBEAFE', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: BLUE, borderRadius: 4 },
  chatScroll: { flex: 1 },
  chat: { flexGrow: 1, padding: 16, paddingBottom: 24, gap: 12 },
  message: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  userMessage: { justifyContent: 'flex-end' },
  botMessage: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 },
  botBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  userBubble: { backgroundColor: NAVY, borderBottomRightRadius: 4 },
  messageText: { color: '#334155', fontSize: 14, lineHeight: 20 },
  userText: { color: '#FFF' },
  controls: { marginTop: 4 },
  disabledControls: { opacity: 0.55 },
  formBlock: { gap: 10 },
  primary: { minHeight: 48, paddingHorizontal: 16, borderRadius: 10, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  secondary: { minHeight: 46, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#93C5FD', backgroundColor: '#EFF6FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { color: NAVY, fontWeight: '800' },
  preview: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#E2E8F0' },
  choiceRow: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  choiceActive: { backgroundColor: '#DBEAFE', borderColor: BLUE },
  choiceText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  choiceTextActive: { color: NAVY },
  primaryChoice: { flex: 1, minHeight: 44, borderRadius: 9, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  neutralChoice: { flex: 1, minHeight: 44, borderRadius: 9, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  neutralChoiceText: { color: '#334155', fontWeight: '800' },
  option: { minHeight: 47, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center' },
  optionText: { flex: 1, color: '#1E293B', fontWeight: '700', fontSize: 14 },
  chevron: { color: BLUE, fontSize: 25, lineHeight: 25 },
  fieldInput: { minHeight: 48, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, backgroundColor: '#FFF', color: '#0F172A', paddingHorizontal: 14, fontSize: 14 },
  help: { color: '#64748B', fontSize: 12, lineHeight: 18 },
  warning: { color: '#9A3412', backgroundColor: '#FFF7ED', borderRadius: 8, padding: 10, fontSize: 12, lineHeight: 18 },
  guestSafetyNotice: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 10, padding: 12 },
  guestSafetyNoticeText: { color: '#78350F', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  countHint: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 14 },
  countTitle: { color: NAVY, fontWeight: '800', marginBottom: 4 },
  reviewCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DCE5F1', borderRadius: 12, padding: 15, gap: 2 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reviewCopy: { flex: 1 },
  reviewLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  reviewValue: { color: '#0F172A', fontSize: 14, fontWeight: '700', marginTop: 2 },
  editText: { color: BLUE, fontSize: 13, fontWeight: '800', padding: 8 },
  submitting: { padding: 18, alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 10 },
  composer: { padding: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  composerInput: { flex: 1, minHeight: 46, maxHeight: 100, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 23, paddingHorizontal: 16, color: '#0F172A', backgroundColor: '#F8FAFC' },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
});
