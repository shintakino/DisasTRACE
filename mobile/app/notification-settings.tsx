import React, { useEffect, useState } from 'react';
import { Alert, Linking, View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2, NotificationBing, Danger, InfoCircle } from 'iconsax-react-native';
import { useAuthStatus } from '../hooks/use-auth-status';
import { supabase } from '../lib/supabase';
import { usePushRegistrationStore } from '../store/use-push-registration-store';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStatus();
  const push = usePushRegistrationStore();
  
  const [alerts, setAlerts] = useState({
    emergencies: true,
    updates: true,
    system: true
  });
  const [loading, setLoading] = useState(false);

  // Load preferences from user metadata
  useEffect(() => {
    if (user?.user_metadata?.notification_preferences) {
      const prefs = user.user_metadata.notification_preferences;
      setAlerts({
        emergencies: prefs.emergencies ?? true,
        updates: prefs.updates ?? true,
        // System notices are opt-out. This matches the broadcast service and
        // prevents a responder from missing safety-critical CDRRMO notices
        // solely because no preference was saved yet.
        system: prefs.system !== false && prefs.system_notices !== false,
      });
    }
  }, [user]);

  const handleToggle = async (key: 'emergencies' | 'updates' | 'system', value: boolean) => {
    if (!user || loading) return;
    
    const newAlerts = { ...alerts, [key]: value };
    setAlerts(newAlerts);
    setLoading(true);

    try {
      const currentMeta = user.user_metadata || {};
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMeta,
          notification_preferences: newAlerts,
        }
      });
      if (error) throw error;
      push.retry();
    } catch (err) {
      setAlerts(alerts);
      console.error('[NotificationSettings] Failed to save preference:', err);
      Alert.alert('Preferences not saved', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="bg-[#1E3A8A] pt-16 pb-6 px-6 rounded-b-3xl relative z-10 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4"
          >
            <ArrowLeft2 size={24} color="#FFFFFF" variant="Outline" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Notifications</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
          <Text className="font-bold text-[#1E3A8A] mb-2">Phone Alert Status</Text>
          <Text className="text-slate-600 text-sm">
            {push.ownerId === user?.id ? push.message : 'Checking phone alert setup…'}
          </Text>
          {!alerts.system && <Text className="text-amber-800 text-sm mt-2">System Notices are off. Turn them on below to receive new announcements.</Text>}
          <View className="flex-row mt-3 gap-4">
            <TouchableOpacity onPress={push.retry} accessibilityRole="button">
              <Text className="text-[#1E3A8A] font-bold">Retry Setup</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void Linking.openSettings()} accessibilityRole="button">
              <Text className="text-[#1E3A8A] font-bold">Phone Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-sm text-slate-500 flex-1 leading-relaxed mr-4">
            Manage how you receive alerts and updates from the CDRRMO DisasTRACE system.
          </Text>
          {loading && <ActivityIndicator color="#1E3A8A" size="small" />}
        </View>
        
        <View className="bg-white rounded-3xl p-2 shadow-sm border border-slate-100 mb-8">
          
          <View className="flex-row items-center justify-between p-4 border-b border-slate-100">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center mr-3">
                <Danger size={20} color="#EF4444" variant="Bold" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-800">Emergency Alerts</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Critical disaster warnings</Text>
              </View>
            </View>
            <Switch 
              disabled={loading}
              value={alerts.emergencies} 
              onValueChange={(val) => handleToggle('emergencies', val)}
              trackColor={{ false: '#CBD5E1', true: '#1E3A8A' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between p-4 border-b border-slate-100">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
                <NotificationBing size={20} color="#3B82F6" variant="Bold" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-800">Report Updates</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Status changes on your reports</Text>
              </View>
            </View>
            <Switch 
              disabled={loading}
              value={alerts.updates} 
              onValueChange={(val) => handleToggle('updates', val)}
              trackColor={{ false: '#CBD5E1', true: '#1E3A8A' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center flex-1 pr-4">
              <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-3">
                <InfoCircle size={20} color="#64748B" variant="Bold" />
              </View>
              <View>
                <Text className="text-base font-bold text-slate-800">System Notices</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Maintenance and general updates</Text>
              </View>
            </View>
            <Switch 
              disabled={loading}
              value={alerts.system} 
              onValueChange={(val) => handleToggle('system', val)}
              trackColor={{ false: '#CBD5E1', true: '#1E3A8A' }}
              thumbColor="#FFFFFF"
            />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
