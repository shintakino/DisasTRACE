import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Siren, Truck, ShieldCheck, Activity, Trash, CloudLightning, Megaphone, FileText } from 'lucide-react-native';
import { useAuthStatus } from '../hooks/use-auth-status';
import { supabase } from '../lib/supabase';

type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
  metadata?: any;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStatus();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

  const fetchNotifications = async (showPulse = true) => {
    if (!user) return;
    if (showPulse) setLoading(true);
    
    try {
      const response = await fetch(`${apiUrl}/api/notifications`);
      const data = await response.json();
      if (response.ok && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('[Notifications] Failed to load:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Subscribe to real-time database changes
      const instanceId = Math.random().toString(36).substring(7);
      const channel = supabase
        .channel(`mobile_notifs_${user.id}_${instanceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[Mobile Realtime] Notification change received:', payload);
            if (payload.eventType === 'INSERT') {
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications((prev) =>
                prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
        );
      }
    } catch (err) {
      console.error('[Notifications] Failed to mark as read:', err);
    }
  };

  const handleNotificationPress = async (item: Notification) => {
    // 1. Mark as read immediately in the DB if it is unread
    if (item.unread) {
      await handleMarkAsRead(item.id);
    }

    // 2. Perform redirection / actions based on notification type
    try {
      if (item.type === 'dispatch_alert' || item.type === 'new_incident') {
        // Redirection for Responders to accept or resume active emergency
        router.replace('/(tabs)');
      } else if (
        item.type === 'ambulance_dispatched' || 
        item.type === 'responder_arrived'
      ) {
        // Redirection for Residents to track the responder in real-time
        router.replace('/help/tracking');
      } else if (
        item.type === 'registration_approved' || 
        item.type === 'registration_rejected'
      ) {
        // Redirection to profile settings
        router.replace('/(tabs)/profile');
      } else if (item.type === 'incident_resolved') {
        // Redirection back to base screen
        router.replace('/(tabs)');
      } else if (item.type === 'report_audited') {
        // Redirection to reports list (under profile stats)
        router.replace('/(tabs)/profile');
      } else if (item.type === 'pagasa_alert') {
        // Route weather warnings to the Map view so they can see context
        router.replace('/(tabs)/map');
      } else if (item.type === 'system_announcement') {
        // Display System Notices directly inside a native overlay alert dialog
        Alert.alert(
          item.title,
          item.body,
          [{ text: 'Dismiss', style: 'cancel' }],
          { cancelable: true }
        );
      }
    } catch (err) {
      console.error('[Notifications] Redirection action failed:', err);
    }
  };


  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    
    Alert.alert('Clear All', 'Are you sure you want to clear all your notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setRefreshing(true);
          try {
            const response = await fetch(`${apiUrl}/api/notifications`, {
              method: 'DELETE',
            });
            if (response.ok) {
              setNotifications([]);
            }
          } catch (err) {
            console.error('[Notifications] Failed to clear all:', err);
          } finally {
            setRefreshing(false);
          }
        }
      }
    ]);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hrs ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'new_incident':
      case 'dispatch_alert':
        return <Siren size={22} color="#EF4444" />;
      case 'ambulance_dispatched':
      case 'responder_arrived':
        return <Truck size={22} color="#1E3A8A" />;
      case 'incident_verified':
      case 'registration_approved':
        return <ShieldCheck size={22} color="#22C55E" />;
      case 'pagasa_alert':
        return <CloudLightning size={22} color="#F59E0B" />;
      case 'system_announcement':
        return <Megaphone size={22} color="#8B5CF6" />;
      case 'report_audited':
        return <FileText size={22} color="#3B82F6" />;
      default:
        return <Activity size={22} color="#64748B" />;
    }
  };

  return (
    <View className="flex-1 bg-[#1E3A8A]">
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="flex-row items-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft color="white" size={24} />
            <Text className="text-white font-bold text-xl ml-2 tracking-tight">Notifications</Text>
          </TouchableOpacity>
          {notifications.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearAll}
              disabled={refreshing}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {refreshing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white text-sm font-medium">Clear All</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <View className="flex-1 bg-white rounded-t-[32px] overflow-hidden">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1E3A8A" size="large" />
          </View>
        ) : (
          <ScrollView 
            className="flex-1 px-6 pt-8" 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-slate-900 font-bold text-sm tracking-wider uppercase mb-5">Alert Box</Text>
            
            {notifications.length === 0 ? (
              <View className="py-20 items-center justify-center">
                <ShieldCheck size={48} color="#94A3B8" />
                <Text className="text-slate-400 text-sm font-bold mt-4">You have zero unread notifications.</Text>
              </View>
            ) : (
              notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                  className={`bg-white rounded-3xl border ${item.unread ? 'border-blue-100 bg-blue-50/10' : 'border-slate-100'} p-5 mb-4 flex-row shadow-sm`}
                >
                  <View className="bg-slate-50 w-12 h-12 rounded-2xl items-center justify-center mr-4 shrink-0">
                    {renderIcon(item.type)}
                  </View>
                  <View className="flex-1 justify-center">
                    <View className="flex-row justify-between items-start mb-1.5">
                      <Text className="font-bold text-base text-slate-900 flex-1 pr-2">{item.title}</Text>
                      {item.unread && (
                        <View className="w-2.5 h-2.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                      )}
                    </View>
                    <Text className="text-slate-600 text-xs leading-relaxed mb-3">
                      {item.body}
                    </Text>
                    <Text className="text-[#1E3A8A]/50 font-bold text-[10px]">
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
