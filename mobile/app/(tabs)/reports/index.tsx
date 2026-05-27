import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, CarFront, Activity, AlertTriangle, MapPin } from 'lucide-react-native';
import { useAuthStatus } from '../../../hooks/use-auth-status';
import { ReportDetailModal } from '../../../components/responder/ReportDetailModal';
import { supabase } from '../../../lib/supabase';

export default function MyReportsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { role } = useAuthStatus();
  const isResponder = role?.includes('responder');

  const fetchReports = async () => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();
      const reqHeaders: any = {};
      if (session?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiUrl}/api/reports`, {
        headers: reqHeaders,
      });
      const result = await response.json();
      
      if (result.data) {
        const mappedReports = result.data.map((r: any) => {
          let icon = AlertTriangle;
          if (r.type?.toLowerCase().includes('vehicular') || r.type?.toLowerCase().includes('collision') || r.type?.toLowerCase().includes('accident')) {
            icon = CarFront;
          } else if (r.type?.toLowerCase().includes('medical') || r.type?.toLowerCase().includes('emergency')) {
            icon = Activity;
          } else if (r.type?.toLowerCase().includes('fire')) {
            icon = Flame;
          }

          return {
            id: r.id,
            type: r.type || 'Incident',
            date: r.date || 'Today',
            status: r.status || 'COMPLETED',
            location: r.location || 'Baliwag City',
            response: r.responderName ? `AMB-${r.responderName.slice(0, 3).toUpperCase()} Dispatched` : 'Dispatched',
            icon,
          };
        });
        setReports(mappedReports);
      }
    } catch (error) {
      console.error('Error fetching reports on mobile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const filteredReports = reports.filter((r) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return r.status === 'ONGOING' || r.status === 'RESPONDING';
    return r.status === 'COMPLETED';
  });

  // Group reports for resident view
  const today: any[] = [];
  const yesterday: any[] = [];
  const older: any[] = [];

  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  filteredReports.forEach((r) => {
    // Parse r.date e.g., "March 21, 2026"
    try {
      const rDate = new Date(r.date);
      const diffTime = Math.abs(now.getTime() - rDate.getTime());
      const diffDays = Math.round(diffTime / oneDay);
      
      if (diffDays === 0 || r.date === 'Today') {
        today.push(r);
      } else if (diffDays === 1) {
        yesterday.push(r);
      } else {
        older.push(r);
      }
    } catch {
      today.push(r);
    }
  });

  const renderReportCard = (report: any) => {
    const Icon = report.icon;
    
    let statusBgColor = 'bg-[#1E3A8A]'; // COMPLETED / default
    if (report.status === 'RESPONDING') statusBgColor = 'bg-[#10B981]'; // Green 500 equivalent
    if (report.status === 'ONGOING') statusBgColor = 'bg-[#F59E0B]'; // Amber 500 equivalent
    
    return (
      <TouchableOpacity 
        key={`${report.id}-${report.status}`}
        activeOpacity={0.7}
        onPress={() => {
          if (isResponder) {
            setSelectedReport(report);
          } else {
            router.push(`/reports/${report.id}`);
          }
        }}
        className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100"
      >
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-14 h-14 rounded-2xl bg-red-200/50 items-center justify-center mr-4">
              <Icon size={28} color="#EF4444" strokeWidth={1.5} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-800">{report.type}</Text>
              <Text className="text-sm text-slate-400">{report.id}</Text>
            </View>
          </View>
          <View className="items-end justify-between h-14 py-1">
            <Text className="text-xs font-medium text-slate-400 uppercase tracking-wider">{report.date}</Text>
            <View className={`px-3 py-1 rounded-full ${statusBgColor}`}>
              <Text className="text-xs font-bold text-white uppercase">{report.status}</Text>
            </View>
          </View>
        </View>
        
        <View className="h-[1px] bg-slate-100 w-full mb-4" />
        
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 pr-2">
            <MapPin size={16} color="#64748B" />
            <Text className="text-sm font-medium text-slate-500 ml-1.5" numberOfLines={1}>{report.location}</Text>
          </View>
          <Text className="text-sm font-medium text-slate-400">{report.response}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, data: any[]) => (
    <View className="mb-2">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">{title}</Text>
      {data.map(renderReportCard)}
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="bg-[#1E3A8A] pt-14 pb-6 px-6" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60 }}>
        <Text className="text-2xl font-bold text-white mb-6">My Reports</Text>
        
        <View className="flex-row bg-[#0F172A]/30 rounded-2xl p-1">
          {['All', 'Active', 'Completed'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 py-3 items-center justify-center rounded-xl ${isActive ? 'bg-white/10' : ''}`}
              >
                <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-6 pt-6 bg-slate-50" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />
        }
      >
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#1E3A8A" />
          </View>
        ) : filteredReports.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-slate-400 font-bold">No reports found</Text>
          </View>
        ) : isResponder ? (
          <>
            {filteredReports.map(renderReportCard)}
          </>
        ) : (
          <>
            {today.length > 0 && renderSection('TODAY', today)}
            {yesterday.length > 0 && renderSection('YESTERDAY', yesterday)}
            {older.length > 0 && renderSection('OLDER', older)}
          </>
        )}
        <View className="h-24" />
      </ScrollView>
      <ReportDetailModal 
        visible={!!selectedReport}
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </View>
  );
}
