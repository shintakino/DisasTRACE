import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Clock3, MapPinned, Radio } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { useChatbotStore } from '../../store/use-chatbot-store';

interface IncidentStatus {
  status: 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'RESOLVED';
  responderId: string | null;
}

function coordinationText(agencies: string[]) {
  if (agencies.length === 0) return null;
  return `Coordinating with ${agencies.length === 1 ? agencies[0] : `${agencies.slice(0, -1).join(', ')} and ${agencies.at(-1)}`}`;
}

function messageFor(incident: IncidentStatus | null, agencies: string[]) {
  const coordination = coordinationText(agencies);
  if (incident?.status === 'ARRIVED') return 'Responders have arrived at your location.';
  if (incident?.status === 'RESOLVED') return 'Response coordination has been completed.';
  if (incident?.status === 'EN_ROUTE' || incident?.responderId) return `${coordination ? `${coordination}. ` : ''}Responders are on the way.`;
  return coordination || 'Coordinating the nearest available responder.';
}

export default function EmergencyResponseStatusScreen() {
  const router = useRouter();
  const report = useEmergencyReportStore((state) => state.report);
  const [incident, setIncident] = useState<IncidentStatus | null>(null);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const isGuest = report.reporterMode === 'guest' && Boolean(report.guestAccessToken);

  useEffect(() => {
    if (report.chatbotOrigin && incident?.status === 'RESOLVED') {
      useChatbotStore.getState().clearReportToIdle();
    }
  }, [incident?.status, report.chatbotOrigin]);

  useEffect(() => {
    if (!report.id) return;
    let mounted = true;
    const requestId = report.id;
    const load = async () => {
      try {
        if (isGuest && report.guestAccessToken) {
          const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'http://192.168.1.8:3000/api';
          const response = await fetch(`${apiUrl}/emergency-intake/status?requestId=${encodeURIComponent(requestId)}&accessToken=${encodeURIComponent(report.guestAccessToken)}`);
          const result = await response.json();
          if (mounted && response.ok) {
            setIncident(result.data.incident);
            setAgencies(result.data.coordinationAgencies || []);
          }
        } else {
          const [{ data: incidentData }, { data: requestData }] = await Promise.all([
            supabase.from('incidents').select('status, responder_id').eq('request_id', requestId).maybeSingle(),
            supabase.from('verification_requests').select('coordination_agencies').eq('id', requestId).maybeSingle(),
          ]);
          const data = incidentData;
          if (mounted && data) setIncident({ status: data.status, responderId: data.responder_id });
          if (mounted && requestData) setAgencies(requestData.coordination_agencies || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    if (isGuest) {
      const interval = setInterval(() => void load(), 3000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
    const channel = supabase.channel(`response-status-${requestId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `request_id=eq.${requestId}` }, (payload) => {
      const record = payload.new as { status?: IncidentStatus['status']; responder_id?: string | null };
      if (record.status) setIncident({ status: record.status, responderId: record.responder_id ?? null });
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'verification_requests', filter: `id=eq.${requestId}` }, (payload) => {
      const record = payload.new as { coordination_agencies?: string[] };
      setAgencies(record.coordination_agencies || []);
    }).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [isGuest, report.guestAccessToken, report.id]);

  const message = useMemo(() => messageFor(incident, agencies), [agencies, incident]);
  return <View style={styles.page}>
    <View style={styles.hero}><Radio color="#FFF" size={34} /><Text style={styles.eyebrow}>EMERGENCY RESPONSE STATUS</Text><Text style={styles.title}>{loading ? 'Checking your response status…' : message}</Text><Text style={styles.caseId}>{report.requestId || 'Emergency report received'}</Text></View>
    <View style={styles.card}>
      <StatusStep icon={<CheckCircle2 color="#16A34A" size={21} />} title="Report received" subtitle="Your incident details and location were recorded." active />
      <StatusStep icon={<Clock3 color={agencies.length > 0 ? '#16A34A' : '#F97316'} size={21} />} title="Response coordination" subtitle={coordinationText(agencies) || 'PACC is coordinating the appropriate response.'} active={agencies.length > 0} />
      <StatusStep icon={<MapPinned color={incident?.responderId ? '#16A34A' : '#94A3B8'} size={21} />} title="Responder movement" subtitle={incident?.responderId ? 'Responders are on the way. Please remain available for further instructions.' : 'This updates when a responder is assigned.'} active={Boolean(incident?.responderId)} />
    </View>
    <TouchableOpacity style={styles.mapButton} onPress={() => router.replace('/help/tracking' as any)} disabled={!incident?.responderId}><Text style={styles.mapButtonText}>{incident?.responderId ? 'Open live ambulance map' : 'Waiting for responder assignment'}</Text></TouchableOpacity>
  </View>;
}

function StatusStep({ icon, title, subtitle, active }: { icon: React.ReactNode; title: string; subtitle: string; active: boolean }) { return <View style={styles.step}><View style={[styles.icon, active && styles.iconActive]}>{icon}</View><View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepSubtitle}>{subtitle}</Text></View></View>; }

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#F3F4F6' }, hero: { backgroundColor: '#1E3A8A', paddingTop: 72, paddingHorizontal: 24, paddingBottom: 44, alignItems: 'center' }, eyebrow: { color: '#BFDBFE', marginTop: 14, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }, title: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 10, lineHeight: 31 }, caseId: { color: '#DBEAFE', marginTop: 10, fontWeight: '600' }, card: { margin: 20, backgroundColor: '#FFF', borderRadius: 12, padding: 18, gap: 18, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, step: { flexDirection: 'row', gap: 13 }, icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }, iconActive: { backgroundColor: '#ECFDF5' }, stepCopy: { flex: 1 }, stepTitle: { color: '#0F172A', fontWeight: '800', fontSize: 15 }, stepSubtitle: { color: '#64748B', fontSize: 13, marginTop: 3, lineHeight: 19 }, mapButton: { backgroundColor: '#EF4444', marginHorizontal: 20, borderRadius: 8, padding: 16, alignItems: 'center' }, mapButtonText: { color: '#FFF', fontWeight: '800' } });
