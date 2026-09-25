import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { type Href, useRouter } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  CarFront,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  Search,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAuthStatus } from '../../../hooks/use-auth-status';
import { ReportDetailModal } from '../../../components/responder/ReportDetailModal';
import { supabase } from '../../../lib/supabase';
import { BALIWAG_BARANGAY_NAMES, formatBaliwagLocation } from '../../../lib/baliwag-location';
import { isPublicResponseComplete } from '../../../lib/public-response-lifecycle';
import { readResidentReportCache, writeResidentReportCache } from '../../../lib/resident-report-cache';

const RESPONDER_PAGE_SIZE = 15;
const TYPE_FILTERS = [
  { label: 'All types', value: '' },
  { label: 'Medical', value: 'Medical Emergency' },
  { label: 'Vehicular', value: 'Vehicular Collision' },
  { label: 'Fire', value: 'Fire Emergency' },
  { label: 'Structural', value: 'Structural Failure' },
  { label: 'Flood/Water', value: 'Flood/Water' },
  { label: 'Unknown', value: 'Unknown Cause' },
  { label: 'Transport', value: 'Patient Transport' },
  { label: 'Other', value: 'Other / non-emergency request' },
] as const;

type StatusFilter = 'all' | 'completed' | 'ongoing';
type SortOrder = 'newest' | 'oldest';
type DateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days';

const DATE_FILTERS: Array<{ label: string; value: DateFilter }> = [
  { label: 'All dates', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
];

function responderDateBounds(filter: DateFilter, now = new Date()) {
  if (filter === 'all') return null;
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  if (filter === 'today') start.setDate(start.getDate() - 1);
  if (filter === 'last_7_days') start.setDate(start.getDate() - 7);
  if (filter === 'last_30_days') start.setDate(start.getDate() - 30);
  return { createdAfter: start.toISOString(), createdBefore: end.toISOString() };
}

type Pagination = {
  page: number;
  total: number;
  totalPages: number;
};

type ReportApiItem = {
  id: string;
  requestId?: string;
  type?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  incidentStatus?: string | null;
  responderName?: string | null;
  vehicleId?: string | null;
  barangay?: string | null;
  location?: string | null;
  residentName?: string | null;
  natureOfCall?: string | null;
  peopleInvolved?: number;
  residentPhotoUrl?: string | null;
  crewFindings?: string | null;
  scenePhotos?: string[];
  duplicates?: Array<Record<string, unknown>>;
};

type ReportListItem = ReportApiItem & {
  type: string;
  date: string;
  status: string;
  location: string;
  response: string;
  icon: LucideIcon;
};

type ReportsApiResponse = {
  data?: ReportApiItem[];
  error?: string;
  page?: number;
  total?: number;
  totalPages?: number;
};

function mapReportItems(items: ReportApiItem[], isResponder: boolean): ReportListItem[] {
  return items.map((report) => {
    let icon: LucideIcon = AlertTriangle;
    if (report.type?.toLowerCase().includes('vehicular') || report.type?.toLowerCase().includes('collision') || report.type?.toLowerCase().includes('accident')) {
      icon = CarFront;
    } else if (report.type?.toLowerCase().includes('medical') || report.type?.toLowerCase().includes('emergency')) {
      icon = Activity;
    } else if (report.type?.toLowerCase().includes('fire')) {
      icon = Flame;
    }

    const rawStatus = report.status || 'COMPLETED';
    const status = !isResponder && rawStatus !== 'REJECTED' && isPublicResponseComplete(report.incidentStatus)
      ? 'COMPLETED'
      : rawStatus;
    const responseLabel = isResponder
      ? (report.vehicleId ? `${report.vehicleId} assigned` : 'Responder report')
      : status === 'REJECTED'
        ? 'Rejected by PACC'
        : status === 'COMPLETED'
          ? 'Responder arrived at the scene'
          : status === 'DUPLICATE'
            ? 'Linked to primary report'
            : status === 'PENDING'
              ? 'Awaiting PACC review'
              : 'Response in progress';

    return {
      ...report,
      type: report.type || 'Incident',
      date: report.date || 'Today',
      status,
      location: formatBaliwagLocation(report.barangay) ?? report.location ?? 'Location unavailable',
      response: responseLabel,
      icon,
    };
  });
}

export default function MyReportsScreen() {
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSavedAt, setOfflineSavedAt] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('');
  const [barangayPickerVisible, setBarangayPickerVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, totalPages: 1 });
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const { role, isLoaded, user } = useAuthStatus();
  const isResponder = role?.includes('responder') ?? false;
  const displayLoading = loading && (!isLoaded || Boolean(user));

  useEffect(() => {
    if (!isResponder) return;
    const timer = setTimeout(() => {
      setPagination((current) => ({ ...current, page: 1 }));
      setSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [isResponder, searchInput]);

  const fetchReports = useCallback(async (asRefresh = false) => {
    const sequence = ++requestSequence.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    // Defer UI state updates so this callback remains safe when started by an effect.
    await Promise.resolve();
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const { data: { session } } = await supabase.auth.getSession();
      const reqHeaders: Record<string, string> = {};
      if (session?.access_token) reqHeaders.Authorization = `Bearer ${session.access_token}`;

      const params = new URLSearchParams({ category: isResponder ? 'responder' : 'user' });
      if (isResponder) {
        if (search) params.set('search', search);
        if (typeFilter) params.set('type', typeFilter);
        if (barangayFilter) params.set('barangay', barangayFilter);
        params.set('status', statusFilter);
        params.set('sort', sortOrder);
        const dateBounds = responderDateBounds(dateFilter);
        if (dateBounds) {
          params.set('createdAfter', dateBounds.createdAfter);
          params.set('createdBefore', dateBounds.createdBefore);
        }
        params.set('page', String(pagination.page));
        params.set('limit', String(RESPONDER_PAGE_SIZE));
      } else {
        if (typeFilter) params.set('type', typeFilter);
        if (barangayFilter) params.set('barangay', barangayFilter);
        if (dateFilter !== 'all') params.set('dateRange', dateFilter);
      }

      const response = await fetch(`${apiUrl}/api/reports?${params.toString()}`, {
        headers: reqHeaders,
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null) as ReportsApiResponse | null;
      if (!response.ok) throw new Error(result?.error || 'Reports could not be loaded. Please try again.');
      if (sequence !== requestSequence.current) return;

      const mappedReports = mapReportItems(Array.isArray(result?.data) ? result.data : [], isResponder);

      setReports(mappedReports);
      setOfflineSavedAt(null);
      if (!isResponder && user?.id) {
        await writeResidentReportCache(user.id, Array.isArray(result?.data) ? result.data : []);
      }
      if (isResponder) {
        setPagination((current) => ({
          page: Number(result?.page) || current.page,
          total: Number(result?.total) || 0,
          totalPages: Math.max(1, Number(result?.totalPages) || 1),
        }));
      }
    } catch (fetchError) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      console.error('Error fetching reports on mobile:', fetchError);
      if (!isResponder && user?.id) {
        const cached = await readResidentReportCache(user.id);
        if (cached) {
          setReports(mapReportItems(cached.reports, false));
          setOfflineSavedAt(cached.savedAt);
          setError('You are offline. Showing your last synced reports.');
        } else {
          setReports([]);
          setError(fetchError instanceof Error ? fetchError.message : 'Reports could not be loaded. Please try again.');
        }
      } else {
        setReports([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Reports could not be loaded. Please try again.');
      }
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [barangayFilter, dateFilter, isResponder, pagination.page, search, sortOrder, statusFilter, typeFilter]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) return;
    const timer = setTimeout(() => void fetchReports(), 0);
    return () => {
      clearTimeout(timer);
      activeRequest.current?.abort();
    };
  }, [fetchReports, isLoaded, user]);

  useEffect(() => {
    // Never render the previous account's report list while a new session is
    // hydrating or its scoped request is still in flight.
    setReports([]);
    setOfflineSavedAt(null);
    setError(null);
  }, [user?.id]);

  const onRefresh = () => void fetchReports(true);

  const changePage = (page: number) => {
    if (loading || refreshing || page < 1 || page > pagination.totalPages) return;
    setPagination((current) => ({ ...current, page }));
  };

  const chooseType = (value: string) => {
    setTypeFilter(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const chooseBarangay = (value: string) => {
    setBarangayFilter(value);
    setBarangayPickerVisible(false);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const chooseStatus = (value: StatusFilter) => {
    setStatusFilter(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const chooseDate = (value: DateFilter) => {
    setDateFilter(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const toggleSort = () => {
    setSortOrder((current) => current === 'newest' ? 'oldest' : 'newest');
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const renderReportCard = (report: ReportListItem) => {
    const Icon = report.icon;
    let statusBgColor = 'bg-[#1E3A8A]';
    if (report.status === 'RESPONDING') statusBgColor = 'bg-[#10B981]';
    if (report.status === 'ONGOING') statusBgColor = 'bg-[#F59E0B]';
    if (report.status === 'CASE_CLOSED' || report.status === 'COMPLETED') statusBgColor = 'bg-[#22C55E]';
    if (report.status === 'REJECTED') statusBgColor = 'bg-[#DC2626]';
    const statusLabel = report.status === 'CASE_CLOSED' ? 'CASE CLOSED' : report.status;
    return (
      <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (isResponder) setSelectedReport(report);
            else router.push(`/(tabs)/reports/${report.id}` as Href);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Open report ${report.id}`}
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
              <Text className="text-xs font-bold text-white uppercase">{statusLabel}</Text>
            </View>
          </View>
        </View>
        <View className="h-[1px] bg-slate-100 w-full mb-4" />
        <View className="flex-row items-start">
          <View className="flex-1 min-w-0 flex-row items-start pr-3">
            <MapPin size={16} color="#64748B" />
            <Text className="text-sm font-medium text-slate-500 ml-1.5 flex-1" numberOfLines={2}>{report.location}</Text>
          </View>
          <View className="max-w-[38%] shrink-0">
            <Text className="text-sm font-medium text-slate-400 text-right" numberOfLines={2}>{report.response}</Text>
          </View>
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  const today: ReportListItem[] = [];
  const yesterday: ReportListItem[] = [];
  const older: ReportListItem[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (!isResponder) {
    reports.forEach((report) => {
      try {
        const timestamp = report.createdAt ? Date.parse(report.createdAt) : Date.parse(report.date);
        if (!Number.isFinite(timestamp)) throw new Error('Invalid report timestamp');
        const reportDate = new Date(timestamp);
        const reportStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()).getTime();
        const diffDays = Math.max(0, Math.floor((todayStart - reportStart) / oneDay));
        if (diffDays === 0 || report.date === 'Today') today.push(report);
        else if (diffDays === 1) yesterday.push(report);
        else older.push(report);
      } catch {
        today.push(report);
      }
    });
  }

  const renderResidentSection = (title: string, data: ReportListItem[]) => (
    <View className="mb-2">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">{title}</Text>
      {data.map((report) => <React.Fragment key={`${report.id}-${report.status}`}>{renderReportCard(report)}</React.Fragment>)}
    </View>
  );

  const responderControls = (
    <View className="pt-5 pb-2">
      <View className="bg-white border border-slate-200 rounded-2xl px-4 flex-row items-center mb-4">
        <Search size={18} color="#64748B" />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search report ID, type, or barangay"
          placeholderTextColor="#94A3B8"
          className="flex-1 py-3.5 px-3 text-slate-800"
          maxLength={80}
          returnKeyType="search"
        />
      </View>

      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Incident type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {TYPE_FILTERS.map((option) => (
          <TouchableOpacity
            key={option.label}
            onPress={() => chooseType(option.value)}
            className={`px-4 py-2 rounded-full mr-2 border ${typeFilter === option.value ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'}`}
          >
            <Text className={`text-xs font-bold ${typeFilter === option.value ? 'text-white' : 'text-slate-600'}`}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Barangay</Text>
      <TouchableOpacity
        onPress={() => setBarangayPickerVisible(true)}
        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex-row items-center justify-between mb-4"
        accessibilityRole="button"
        accessibilityLabel={`Filter reports by barangay. Current selection: ${barangayFilter || 'all barangays'}`}
      >
        <View className="flex-row items-center flex-1">
          <MapPin size={18} color="#1E3A8A" />
          <Text className="ml-3 text-sm font-bold text-slate-700" numberOfLines={1}>
            {barangayFilter || 'All barangays'}
          </Text>
        </View>
        <ChevronDown size={18} color="#64748B" />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {DATE_FILTERS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => chooseDate(option.value)}
            className={`px-4 py-2 rounded-full mr-2 border ${dateFilter === option.value ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === option.value }}
            accessibilityLabel={`Show reports from ${option.label.toLowerCase()}`}
          >
            <Text className={`text-xs font-bold ${dateFilter === option.value ? 'text-white' : 'text-slate-600'}`}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row">
          {(['all', 'completed', 'ongoing'] as StatusFilter[]).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => chooseStatus(value)}
              className={`px-3 py-2 rounded-xl mr-2 ${statusFilter === value ? 'bg-blue-100' : 'bg-white border border-slate-200'}`}
            >
              <Text className={`text-xs font-bold capitalize ${statusFilter === value ? 'text-[#1E3A8A]' : 'text-slate-500'}`}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={toggleSort} className="px-3 py-2 rounded-xl bg-white border border-slate-200">
          <Text className="text-xs font-bold text-slate-600">{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
          <Text className="text-sm font-semibold text-red-700 mb-2">{error}</Text>
          <TouchableOpacity onPress={() => void fetchReports()} className="self-start">
            <Text className="text-sm font-bold text-[#1E3A8A]">Try again</Text>
          </TouchableOpacity>
        </View>
      )}
      {!displayLoading && !error && (
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
          {pagination.total} {pagination.total === 1 ? 'report' : 'reports'}
        </Text>
      )}
    </View>
  );

  const residentControls = (
    <View className="pt-5 pb-2">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {DATE_FILTERS.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => chooseDate(option.value)}
            className={`px-4 py-2 rounded-full mr-2 border flex-row items-center ${dateFilter === option.value ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: dateFilter === option.value }}
            accessibilityLabel={`Show reports from ${option.label.toLowerCase()}`}
          >
            {option.value === 'all' ? null : <CalendarDays size={14} color={dateFilter === option.value ? '#FFFFFF' : '#64748B'} className="mr-1.5" />}
            <Text className={`text-xs font-bold ${dateFilter === option.value ? 'text-white' : 'text-slate-600'}`}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Incident type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {TYPE_FILTERS.map((option) => (
          <TouchableOpacity
            key={option.label}
            onPress={() => chooseType(option.value)}
            className={`px-4 py-2 rounded-full mr-2 border ${typeFilter === option.value ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: typeFilter === option.value }}
          >
            <Text className={`text-xs font-bold ${typeFilter === option.value ? 'text-white' : 'text-slate-600'}`}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Barangay</Text>
      <TouchableOpacity
        onPress={() => setBarangayPickerVisible(true)}
        className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex-row items-center justify-between mb-4"
        accessibilityRole="button"
        accessibilityLabel={`Filter reports by barangay. Current selection: ${barangayFilter || 'all barangays'}`}
      >
        <View className="flex-row items-center flex-1">
          <MapPin size={18} color="#1E3A8A" />
          <Text className="ml-3 text-sm font-bold text-slate-700" numberOfLines={1}>{barangayFilter || 'All barangays'}</Text>
        </View>
        <ChevronDown size={18} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  const paginationFooter = !displayLoading && !error && reports.length > 0 ? (
    <View className="flex-row items-center justify-between bg-white border border-slate-200 rounded-2xl px-3 py-3 mb-24 mt-1">
      <TouchableOpacity
        disabled={pagination.page <= 1}
        onPress={() => changePage(pagination.page - 1)}
        className={`w-11 h-11 rounded-xl items-center justify-center ${pagination.page <= 1 ? 'bg-slate-100' : 'bg-blue-50'}`}
        accessibilityLabel="Previous reports page"
        accessibilityState={{ disabled: pagination.page <= 1 }}
      >
        <ChevronLeft size={20} color={pagination.page <= 1 ? '#94A3B8' : '#1E3A8A'} />
      </TouchableOpacity>
      <View className="items-center">
        <Text className="text-sm font-bold text-slate-800">Page {pagination.page} of {pagination.totalPages}</Text>
        <Text className="text-xs text-slate-500">Up to {RESPONDER_PAGE_SIZE} per page</Text>
      </View>
      <TouchableOpacity
        disabled={pagination.page >= pagination.totalPages}
        onPress={() => changePage(pagination.page + 1)}
        className={`w-11 h-11 rounded-xl items-center justify-center ${pagination.page >= pagination.totalPages ? 'bg-slate-100' : 'bg-blue-50'}`}
        accessibilityLabel="Next reports page"
        accessibilityState={{ disabled: pagination.page >= pagination.totalPages }}
      >
        <ChevronRight size={20} color={pagination.page >= pagination.totalPages ? '#94A3B8' : '#1E3A8A'} />
      </TouchableOpacity>
    </View>
  ) : <View className="h-24" />;

  return (
    <View className="flex-1 bg-white">
      <View className="bg-[#1E3A8A] pt-14 pb-6 px-6" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 20 : 60 }}>
        <Text className="text-2xl font-bold text-white">My Reports</Text>
      </View>

      {isResponder ? (
        <FlatList
          data={displayLoading ? [] : reports}
          keyExtractor={(item) => `${item.id}-${item.status}`}
          renderItem={({ item }) => renderReportCard(item)}
          className="flex-1 bg-slate-50"
          contentContainerStyle={{ paddingHorizontal: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
          ListHeaderComponent={responderControls}
          ListEmptyComponent={displayLoading ? (
            <View className="items-center py-16"><ActivityIndicator size="large" color="#1E3A8A" /></View>
          ) : !error ? (
            <View className="items-center py-16">
              <Text className="text-slate-700 font-bold mb-1">No reports found</Text>
              <Text className="text-slate-400 text-center">
                Try changing the search or filters.
              </Text>
            </View>
          ) : null}
          ListFooterComponent={paginationFooter}
        />
      ) : (
        <ScrollView
          className="flex-1 px-6 pt-6 bg-slate-50"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} />}
        >
          {residentControls}
          {displayLoading ? (
            <View className="items-center py-20"><ActivityIndicator size="large" color="#1E3A8A" /></View>
          ) : error ? (
            <>
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
                <Text className="text-amber-800 font-bold text-center mb-2">{error}</Text>
                {offlineSavedAt ? <Text className="text-amber-700 text-xs text-center mb-2">Last synced {new Date(offlineSavedAt).toLocaleString()}</Text> : null}
                <TouchableOpacity onPress={() => void fetchReports()}><Text className="font-bold text-[#1E3A8A] text-center">Try again</Text></TouchableOpacity>
              </View>
              {reports.length > 0 ? (
                <>
                  {today.length > 0 && renderResidentSection('TODAY', today)}
                  {yesterday.length > 0 && renderResidentSection('YESTERDAY', yesterday)}
                  {older.length > 0 && renderResidentSection('OLDER', older)}
                </>
              ) : (
                <View className="items-center py-16"><Text className="text-slate-400 font-bold">No reports available offline</Text></View>
              )}
            </>
          ) : reports.length === 0 ? (
            <View className="items-center py-20"><Text className="text-slate-400 font-bold">No reports found</Text></View>
          ) : (
            <>
              {today.length > 0 && renderResidentSection('TODAY', today)}
              {yesterday.length > 0 && renderResidentSection('YESTERDAY', yesterday)}
              {older.length > 0 && renderResidentSection('OLDER', older)}
            </>
          )}
          <View className="h-24" />
        </ScrollView>
      )}

      <ReportDetailModal visible={!!selectedReport} report={selectedReport} onClose={() => setSelectedReport(null)} />
      <Modal
        transparent
        animationType="slide"
        visible={barangayPickerVisible}
        onRequestClose={() => setBarangayPickerVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl px-6 pt-5 pb-8 max-h-[78%]">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-xl font-bold text-[#1E3A8A]">Filter by barangay</Text>
                <Text className="text-sm text-slate-500 mt-1">Show only your reports from one official Baliwag barangay.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBarangayPickerVisible(false)}
                className="px-3 py-2 rounded-xl bg-slate-100"
                accessibilityRole="button"
                accessibilityLabel="Close barangay filter"
              >
                <Text className="text-sm font-bold text-slate-600">Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {['', ...BALIWAG_BARANGAY_NAMES].map((barangay) => {
                const selected = barangayFilter === barangay;
                const label = barangay || 'All barangays';
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => chooseBarangay(barangay)}
                    className={`flex-row items-center justify-between py-4 border-b border-slate-100 ${selected ? 'bg-blue-50 -mx-2 px-2 rounded-xl border-b-0 mb-1' : ''}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Show reports from ${label}`}
                  >
                    <Text className={`text-base ${selected ? 'font-bold text-[#1E3A8A]' : 'font-medium text-slate-700'}`}>{label}</Text>
                    {selected && <Check size={20} color="#1E3A8A" strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
