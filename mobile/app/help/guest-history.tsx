import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, Clock3, RefreshCw, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  getGuestReportAccessToken,
  listGuestReportHistory,
  removeGuestReportHistory,
  updateGuestReportHistory,
  type GuestReportHistoryEntry,
} from '../../lib/guest-report-history';
import { getChatbotReportStatus } from '../../services/chatbot-api';
import { GuestAllowanceBanner } from '../../components/guest/GuestAllowanceBanner';

export default function GuestHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<GuestReportHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setEntries(await listGuestReportHistory());
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const refresh = async (entry: GuestReportHistoryEntry) => {
    setRefreshingId(entry.id);
    try {
      const token = await getGuestReportAccessToken(entry.id);
      if (!token) throw new Error('This saved report has no private refresh credential on this device. Its saved status and conversation are still available.');
      const latest = await getChatbotReportStatus({ reporterMode: 'guest', requestId: entry.id, guestAccessToken: token });
      await updateGuestReportHistory(entry.id, {
        status: latest.outcome === 'CASE_CLOSED' ? 'RESOLVED' : latest.outcome === 'CANCELLED' ? 'CANCELLED' : latest.status,
        responseStatus: latest.responseStatus,
        rejectionReason: latest.rejectionReason ?? undefined,
        reportsRemaining: latest.guestAllowance?.remaining ?? entry.reportsRemaining,
      });
      await load();
    } catch (error) {
      Alert.alert('Unable to refresh report', error instanceof Error ? error.message : 'Please check your connection.');
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={styles.icon} onPress={() => router.back()}><ChevronLeft color="#0F172A" /></TouchableOpacity>
        <View><Text style={styles.title}>Guest Report History</Text><Text style={styles.subtitle}>Saved only on this device</Text></View>
      </View>
      {loading ? <ActivityIndicator style={styles.loading} color="#1E3A8A" /> : (
        <ScrollView contentContainerStyle={styles.list}>
          <GuestAllowanceBanner remaining={entries.find((entry) => entry.reportsRemaining !== undefined)?.reportsRemaining} />
          {entries.length === 0 ? (
            <View style={styles.empty}><Clock3 color="#64748B" size={30} /><Text style={styles.emptyTitle}>No guest reports yet</Text><Text style={styles.subtitle}>Reports submitted in Guest Mode will appear here.</Text></View>
          ) : entries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.row}><Text style={styles.requestId}>{entry.displayId}</Text><Text style={[styles.status, entry.status === 'REJECTED' && styles.rejected]}>{entry.status === 'RESOLVED' ? 'CASE CLOSED' : entry.status}</Text></View>
              <Text style={styles.type}>{entry.incidentType}</Text>
              <Text style={styles.response}>{entry.responseStatus}</Text>
              {entry.rejectionReason ? <Text style={styles.reason}>Reason: {entry.rejectionReason}</Text> : null}
              <Text style={styles.date}>{new Date(entry.createdAt).toLocaleString()}</Text>
              {expandedId === entry.id ? (
                <View style={styles.transcript}>
                  {entry.messages.map((message, index) => (
                    <View key={`${entry.id}-${index}`} style={[styles.message, message.role === 'user' && styles.userMessage]}>
                      <Text style={[styles.messageText, message.role === 'user' && styles.userMessageText]}>{message.text}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.action} onPress={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                  <Clock3 size={15} color="#1E3A8A" /><Text style={styles.actionText}>{expandedId === entry.id ? 'Hide conversation' : 'View conversation'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => void refresh(entry)} disabled={refreshingId === entry.id}>
                  {refreshingId === entry.id ? <ActivityIndicator size="small" color="#1E3A8A" /> : <RefreshCw size={15} color="#1E3A8A" />}<Text style={styles.actionText}>Refresh status</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityLabel={`Remove ${entry.displayId} from device`} style={styles.delete} onPress={() => Alert.alert('Remove saved report?', 'This removes only the device copy. PACC retains the official record.', [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { await removeGuestReportHistory(entry.id); await load(); } }])}><Trash2 size={16} color="#B91C1C" /></TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { minHeight: 68, paddingHorizontal: 12, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  icon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 12, marginTop: 2 },
  loading: { marginTop: 48 },
  list: { padding: 16, gap: 12 },
  empty: { marginTop: 64, alignItems: 'center', gap: 8 },
  emptyTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  requestId: { color: '#0F172A', fontWeight: '900' },
  status: { color: '#166534', fontSize: 10, fontWeight: '900' },
  rejected: { color: '#B91C1C' },
  type: { color: '#1E3A8A', fontWeight: '800', marginTop: 8 },
  response: { color: '#475569', lineHeight: 19, marginTop: 6 },
  reason: { color: '#991B1B', backgroundColor: '#FEF2F2', padding: 9, borderRadius: 8, marginTop: 8 },
  date: { color: '#94A3B8', fontSize: 11, marginTop: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#1E3A8A', fontWeight: '800', fontSize: 12 },
  delete: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  transcript: { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 12, paddingTop: 10, gap: 7 },
  message: { alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#1E3A8A' },
  messageText: { color: '#334155', fontSize: 12, lineHeight: 17 },
  userMessageText: { color: '#FFF' },
});
