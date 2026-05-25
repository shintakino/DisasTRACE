import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, CarFront, Activity, AlertTriangle, MapPin } from 'lucide-react-native';
import { useAuthStatus } from '../../../hooks/use-auth-status';
import { ReportDetailModal } from '../../../components/responder/ReportDetailModal';

const mockReports = {
  today: [
    {
      id: 'DR-2026-0847',
      type: 'Vehicular Accident',
      date: 'MAR 16, 2026',
      status: 'ONGOING',
      location: 'Brgy. Sabang, Baliwag City',
      response: 'AMB-001 dispatched',
      icon: CarFront,
    },
    {
      id: 'DR-2026-0847',
      type: 'Vehicular Accident',
      date: 'MAR 16, 2026',
      status: 'RESPONDING',
      location: 'Brgy. Sabang, Baliwag City',
      response: 'AMB-001 dispatched',
      icon: CarFront,
    }
  ],
  yesterday: [
    {
      id: 'DR-2026-0842',
      type: 'Vehicular Accident',
      date: 'MAR 15, 2026',
      status: 'COMPLETED',
      location: 'Brgy. Paitan, Baliwag City',
      response: 'AMB-002 dispatched',
      icon: CarFront,
    }
  ],
  lastWeek: [
    {
      id: 'DR-2026-0841',
      type: 'Medical Emergency',
      date: 'MAR 10, 2026',
      status: 'COMPLETED',
      location: 'Brgy. Tarcan, Baliwag',
      response: '34 min response',
      icon: Activity,
    },
    {
      id: 'DR-2026-0830',
      type: 'Disaster-Related',
      date: 'MAR 01, 2026',
      status: 'COMPLETED',
      location: 'Brgy. Tangos, Baliwag',
      response: '9 min response',
      icon: AlertTriangle,
    }
  ]
};

export default function MyReportsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All');
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const { role } = useAuthStatus();
  const isResponder = role?.includes('responder');

  const flatReports = [...mockReports.today, ...mockReports.yesterday, ...mockReports.lastWeek];

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

      <ScrollView className="flex-1 px-6 pt-6 bg-slate-50" showsVerticalScrollIndicator={false}>
        {isResponder ? (
          <>
            {flatReports.map(renderReportCard)}
          </>
        ) : (
          <>
            {renderSection('TODAY', mockReports.today)}
            {renderSection('YESTERDAY', mockReports.yesterday)}
            {renderSection('LAST WEEK', mockReports.lastWeek)}
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
