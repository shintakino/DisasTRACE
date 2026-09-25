import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Phone, RefreshCw, Send, ShieldAlert, UserRound, WifiOff, X } from 'lucide-react-native';
import { syncChatbotReportToEmergencyStore } from '../../lib/chatbot-report-bridge';
import { useRejectedReportRecovery } from '../../hooks/use-rejected-report-recovery';
import { supabase } from '../../lib/supabase';
import { askChatbot, cancelChatbotReport, ChatbotApiError, getChatbotReportStatus } from '../../services/chatbot-api';
import { useChatbotStore } from '../../store/use-chatbot-store';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { appendGuestReportMessages, updateGuestReportHistory } from '../../lib/guest-report-history';
import { reportRefreshCopy } from '../../lib/report-status-feedback';
import { GuestAllowanceBanner } from '../../components/guest/GuestAllowanceBanner';
import { getPublicHomeNavigationPlan } from '../../lib/public-home-navigation';

const NAVY = '#1E3A8A';
const BLUE = '#3B82F6';
const PACC_PHONE = '09436018271';
type Message = { id: string; role: 'bot' | 'user'; text: string };

function makeMessage(role: Message['role'], text: string): Message {
  return { id: `${Date.now()}-${Math.random()}`, role, text };
}

export default function ChatbotPendingScreen() {
  const router = useRouter();
  const {
    activeReport,
    draft,
    ownerId,
    hasHydrated,
    updateActiveReport,
    markActiveResponse,
    clearReportToIdle,
  } = useChatbotStore();
  const [messages, setMessages] = useState<Message[]>([makeMessage(
    'bot',
    'Your report was sent successfully. Its details are locked while PACC reviews it. You may still ask approved general safety or DisasTRACE questions.',
  )]);
  const [composer, setComposer] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actorReady, setActorReady] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshLock = useRef(false);
  const screenActiveRef = useRef(true);
  const isLeavingRef = useRef(false);
  const activeReportId = activeReport?.id;
  const activeReporterMode = activeReport?.reporterMode;
  const activeGuestToken = activeReport?.guestAccessToken;
  const { handleRejectedReport, hasHandledRejection } = useRejectedReportRecovery(
    activeReporterMode === 'guest' ? 'guest' : 'registered',
  );
  const scrollRef = useRef<ScrollView>(null);

  const addMessage = (role: Message['role'], text: string) => {
    setMessages((current) => [...current, makeMessage(role, text)]);
    if (activeReporterMode === 'guest' && activeReportId) {
      void appendGuestReportMessages(activeReportId, [{ role, text }]);
    }
  };

  const returnHome = useCallback(() => {
    if (!activeReport || isLeavingRef.current) return;
    isLeavingRef.current = true;
    // Mark inactive before navigation so a status request which resolves in
    // the transition cannot issue a competing route or set screen state.
    screenActiveRef.current = false;
    router.replace(getPublicHomeNavigationPlan(activeReport.reporterMode).route as never);
  }, [activeReport, router]);

  useEffect(() => {
    screenActiveRef.current = true;
    return () => {
      screenActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    let mounted = true;
    const verifyActor = async () => {
      if (!activeReportId || !activeReporterMode) {
        if (mounted) setActorReady(true);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted || !screenActiveRef.current || isLeavingRef.current) return;
      const expectedOwnerId = activeReporterMode === 'guest' ? 'guest' : session?.user.id;
      if (!expectedOwnerId || ownerId !== expectedOwnerId) {
        clearReportToIdle();
        useEmergencyReportStore.getState().resetReport();
        router.replace((activeReporterMode === 'guest' ? '/' : '/(auth)/sign-in') as never);
        return;
      }
      if (mounted) setActorReady(true);
    };
    void verifyActor();
    return () => { mounted = false; };
  }, [activeReportId, activeReporterMode, clearReportToIdle, hasHydrated, ownerId, router]);

  useEffect(() => {
    if (!hasHydrated || !actorReady) return;
    if (!screenActiveRef.current || isLeavingRef.current) return;
    if (!activeReport) {
      if (hasHandledRejection.current) return;
      router.replace('/help/chatbot' as never);
      return;
    }
    syncChatbotReportToEmergencyStore({ draft, activeReport, submissionId: activeReport.id });
    if (activeReport.hasIncident && activeReport.reporterMode !== 'guest') {
      markActiveResponse();
      router.replace('/help/response-status' as never);
    }
  }, [activeReport, actorReady, draft, hasHandledRejection, hasHydrated, markActiveResponse, router]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const refreshStatus = useCallback(async () => {
    if (!activeReportId || !activeReporterMode || refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    try {
      const status = await getChatbotReportStatus({
        reporterMode: activeReporterMode,
        requestId: activeReportId,
        guestAccessToken: activeGuestToken,
      });
      if (!screenActiveRef.current || isLeavingRef.current) return;
      setLastCheckedAt(new Date());
      setRefreshError(null);
      if (status.status === 'REJECTED') {
        handleRejectedReport(status.rejectionReason);
        return;
      }
      const hasIncident = Boolean(status.incident);
      updateActiveReport({
        status: status.status,
        responseStatus: status.responseStatus,
        incidentId: status.incident?.id,
        trackingRequestId: status.trackingRequestId,
        triageClassification: status.triageClassification ?? undefined,
        hasIncident,
        isMergedDuplicate: status.isMergedDuplicate,
        reportsRemaining: status.guestAllowance?.remaining,
      });
      if (activeReporterMode === 'guest') {
        void updateGuestReportHistory(activeReportId, {
          status: status.publicStatus === 'COMPLETED_AT_SCENE' ? 'COMPLETED' : status.status,
          responseStatus: status.responseStatus,
          rejectionReason: status.rejectionReason ?? undefined,
          reportsRemaining: status.guestAllowance?.remaining,
        });
      }
      useEmergencyReportStore.getState().setDetails({
        incidentId: status.incident?.id,
        isMergedDuplicate: status.isMergedDuplicate,
        responderFullName: status.responder?.fullName ?? undefined,
      });

      if ((hasIncident || status.status === 'VERIFIED') && activeReporterMode !== 'guest') {
        markActiveResponse();
        router.replace('/help/response-status' as never);
      }
    } catch (error) {
      // Preserve the last verified status. Polling continues independently.
      if (screenActiveRef.current && !isLeavingRef.current) {
        setRefreshError(error instanceof Error ? error.message : 'Status refresh failed.');
      }
    } finally {
      refreshLock.current = false;
      if (screenActiveRef.current && !isLeavingRef.current) setRefreshing(false);
    }
  }, [activeGuestToken, activeReportId, activeReporterMode, handleRejectedReport, markActiveResponse, router, updateActiveReport]);

  useEffect(() => {
    if (!activeReportId) return;
    void refreshStatus();
    const interval = setInterval(() => void refreshStatus(), 3_000);
    return () => clearInterval(interval);
  }, [activeReportId, refreshStatus]);

  const callPacc = () => {
    void Linking.openURL(`tel:${PACC_PHONE}`).catch(() => {
      Alert.alert('Call PACC', `Please call ${PACC_PHONE}.`);
    });
  };

  const confirmCancellation = () => {
    if (!activeReport) return;
    Alert.alert(
      'Cancel submitted report?',
      'PACC can cancel it only while the request is still pending and no incident or response has started.',
      [
        { text: 'Keep report', style: 'cancel' },
        {
          text: 'Cancel report',
          style: 'destructive',
          onPress: async () => {
            setWaiting(true);
            try {
              await cancelChatbotReport({
                reporterMode: activeReport.reporterMode,
                requestId: activeReport.id,
                guestAccessToken: activeReport.guestAccessToken,
              });
              clearReportToIdle();
              useEmergencyReportStore.getState().resetReport();
              Alert.alert(
                'Report cancelled',
                'The report was cancelled before a response started. PACC will not dispatch it, and you may start a new report.',
                [{ text: 'Start a new report', onPress: () => router.replace(`/help/chatbot?mode=${activeReport.reporterMode === 'guest' ? 'guest' : 'resident'}` as never) }],
              );
            } catch (error) {
              const locked = error instanceof ChatbotApiError && error.status === 409;
              Alert.alert(
                locked ? 'Report can no longer be cancelled' : 'Unable to cancel report',
                error instanceof Error ? error.message : 'Please try again.',
                locked ? [{ text: 'Close', style: 'cancel' }, { text: 'Call PACC', onPress: callPacc }] : undefined,
              );
            } finally {
              setWaiting(false);
            }
          },
        },
      ],
    );
  };

  const ask = async () => {
    const message = composer.trim();
    if (!message || waiting || !activeReport) return;
    setComposer('');
    addMessage('user', message);
    if (/^(?:return\s+home|go\s+home|home)$/i.test(message)) {
      returnHome();
      return;
    }
    if (/^(?:track|track\s+report|view\s+(?:report|response)(?:\s+status)?)$/i.test(message)) {
      if (activeReport.hasIncident && activeReport.reporterMode !== 'guest') router.replace('/help/response-status' as never);
      else addMessage('bot', `Latest report status: ${activeReport.responseStatus}`);
      return;
    }
    setWaiting(true);
    try {
      const response = await askChatbot({
        message,
        reporterMode: activeReport.reporterMode,
        mode: 'SUBMITTED_PENDING',
        draft,
      });
      const latestStatus = useChatbotStore.getState().activeReport?.responseStatus ?? activeReport.responseStatus;
      addMessage('bot', `${response.reply}\n\nLatest report status: ${latestStatus}`);
      if (response.action === 'CANCEL_SUBMITTED') confirmCancellation();
    } catch (error) {
      const latestStatus = useChatbotStore.getState().activeReport?.responseStatus ?? activeReport.responseStatus;
      addMessage('bot', `${error instanceof Error ? error.message : 'I could not process that question.'}\n\nLatest report status: ${latestStatus}`);
    } finally {
      setWaiting(false);
    }
  };

  if (!hasHydrated || !actorReady || !activeReport) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator color={NAVY} size="large" /></SafeAreaView>;
  }

  const canCancel = activeReport.status === 'PENDING' && !activeReport.hasIncident;
  const isRejected = activeReport.status === 'REJECTED';
  const refreshCopy = reportRefreshCopy({ lastCheckedAt, error: refreshError });
  const removeClosedReport = () => {
    Alert.alert(
      'Remove closed report?',
      'This only removes the closed report from this device. PACC keeps the report in its closed-record queue.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove from device',
          style: 'destructive',
          onPress: () => {
            clearReportToIdle();
            useEmergencyReportStore.getState().resetReport();
            returnHome();
          },
        },
      ],
    );
  };
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Return home" style={styles.iconButton} onPress={returnHome}><ChevronLeft color="#1E293B" size={22} /></TouchableOpacity>
        <View style={styles.badge}><ShieldAlert color="#FFF" size={18} /></View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>DisasTRACE Assistant</Text>
          <Text style={styles.subtitle}>Report submitted — details are locked</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeading}>
          <View>
            <Text style={styles.statusLabel}>REPORT STATUS</Text>
            <Text style={styles.requestId}>{activeReport.displayId}</Text>
          </View>
          <View style={styles.statusPill}><Text style={styles.statusPillText}>{activeReport.status}</Text></View>
        </View>
        <Text style={styles.statusText}>{activeReport.responseStatus}</Text>
        <View style={[styles.refreshState, refreshCopy.tone === 'warning' && styles.refreshWarning]}>
          {refreshCopy.tone === 'warning' ? <WifiOff color="#B45309" size={15} /> : null}
          <Text style={[styles.refreshStateText, refreshCopy.tone === 'warning' && styles.refreshWarningText]}>{refreshCopy.text}</Text>
          {refreshCopy.tone === 'warning' ? (
            <TouchableOpacity onPress={() => void refreshStatus()} disabled={refreshing} style={styles.retryButton}>
              <RefreshCw color={NAVY} size={14} /><Text style={styles.retryText}>Retry now</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {activeReport.reporterMode === 'guest' ? (
          <GuestAllowanceBanner
            remaining={activeReport.reportsRemaining}
            style={styles.allowanceBox}
            showReminder={false}
            showRegistrationAction={false}
          />
        ) : null}
        {isRejected ? (
          <TouchableOpacity style={styles.removeButton} onPress={removeClosedReport}>
            <X color="#B91C1C" size={16} /><Text style={styles.removeText}>Remove from this device</Text>
          </TouchableOpacity>
        ) : canCancel ? (
          <TouchableOpacity style={styles.cancelButton} onPress={confirmCancellation} disabled={waiting}>
            <X color="#B91C1C" size={16} /><Text style={styles.cancelText}>Cancel report</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.callButton} onPress={callPacc}>
            <Phone color={NAVY} size={16} /><Text style={styles.callText}>Call PACC about this report</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.lockedSummary}>
        <CheckCircle2 color={BLUE} size={17} />
        <Text style={styles.lockedText} numberOfLines={2}>
          {draft.incidentType} · {draft.peopleInvolved} {draft.peopleInvolved === 1 ? 'person' : 'people'} · {draft.victimCondition}
        </Text>
      </View>

      <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chat} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {waiting ? <ActivityIndicator color={BLUE} /> : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={composer}
          onChangeText={setComposer}
          onSubmitEditing={() => void ask()}
          placeholder="Ask an approved general question"
          placeholderTextColor="#64748B"
          style={styles.input}
          onFocus={() => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send chat message" style={styles.sendButton} onPress={() => void ask()} disabled={waiting}>
          {waiting ? <ActivityIndicator color="#FFF" size="small" /> : <Send color="#FFF" size={18} />}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: Message }) {
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

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  page: { flex: 1, backgroundColor: '#F3F4F6' },
  keyboardArea: { flex: 1 },
  header: { minHeight: 66, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 34, height: 34, borderRadius: 17, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 11, marginTop: 2 },
  statusCard: { margin: 16, marginBottom: 10, padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statusHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  statusLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  requestId: { color: '#0F172A', fontSize: 16, fontWeight: '800', marginTop: 3 },
  statusPill: { backgroundColor: '#DBEAFE', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { color: NAVY, fontSize: 10, fontWeight: '900' },
  statusText: { color: '#334155', fontSize: 14, lineHeight: 20, marginTop: 12 },
  refreshing: { color: '#64748B', fontSize: 11, marginTop: 7 },
  refreshState: { marginTop: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  refreshStateText: { color: '#64748B', fontSize: 11, flexShrink: 1 },
  refreshWarning: { borderRadius: 8, backgroundColor: '#FFFBEB', padding: 9 },
  refreshWarningText: { color: '#92400E', flex: 1 },
  retryButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  retryText: { color: NAVY, fontSize: 11, fontWeight: '800' },
  allowanceBox: { marginTop: 10 },
  cancelButton: { alignSelf: 'flex-start', minHeight: 44, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  cancelText: { color: '#B91C1C', fontSize: 13, fontWeight: '800' },
  removeButton: { alignSelf: 'flex-start', minHeight: 44, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  removeText: { color: '#B91C1C', fontSize: 13, fontWeight: '800' },
  callButton: { alignSelf: 'flex-start', minHeight: 44, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  callText: { color: NAVY, fontSize: 13, fontWeight: '800' },
  lockedSummary: { marginHorizontal: 16, marginBottom: 4, backgroundColor: '#EFF6FF', borderRadius: 9, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedText: { flex: 1, color: '#334155', fontSize: 12, lineHeight: 17 },
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
  composer: { padding: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 23, paddingHorizontal: 16, color: '#0F172A', backgroundColor: '#F8FAFC' },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
});
