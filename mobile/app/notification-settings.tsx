import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2, NotificationBing, Danger, InfoCircle } from 'iconsax-react-native';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  
  const [alerts, setAlerts] = React.useState({
    emergencies: true,
    updates: true,
    system: false
  });

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
        <Text className="text-sm text-slate-500 mb-6 leading-relaxed">
          Manage how you receive alerts and updates from the CDRRMO DisasTRACE system.
        </Text>
        
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
              value={alerts.emergencies} 
              onValueChange={(val) => setAlerts({...alerts, emergencies: val})}
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
              value={alerts.updates} 
              onValueChange={(val) => setAlerts({...alerts, updates: val})}
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
              value={alerts.system} 
              onValueChange={(val) => setAlerts({...alerts, system: val})}
              trackColor={{ false: '#CBD5E1', true: '#1E3A8A' }}
              thumbColor="#FFFFFF"
            />
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
