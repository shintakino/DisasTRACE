import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2, Lock1, DocumentText } from 'iconsax-react-native';
import { supabase } from '../lib/supabase';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid new password.');
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      Alert.alert('Success', 'Your password has been successfully updated.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error('[PrivacySecurity] Password update error:', err);
      Alert.alert('Error', err.message || 'Failed to update password.');
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
            disabled={loading}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4"
          >
            <ArrowLeft2 size={24} color="#FFFFFF" variant="Outline" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Privacy & Security</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
              <Lock1 size={20} color="#1E3A8A" variant="Bold" />
            </View>
            <Text className="text-lg font-bold text-slate-800">Change Password</Text>
          </View>
          
          <View className="mb-4">
            <Text className="text-sm font-semibold text-slate-700 mb-2">Current Password</Text>
            <TextInput 
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              editable={!loading}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
              placeholder="Enter current password"
            />
          </View>
          
          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 mb-2">New Password</Text>
            <TextInput 
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!loading}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
              placeholder="Enter new password"
            />
          </View>

          <TouchableOpacity 
            className="bg-[#1E3A8A] rounded-xl py-4 items-center shadow-md flex-row justify-center"
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading && <ActivityIndicator color="white" size="small" className="mr-2" />}
            <Text className="text-white font-bold text-base">
              {loading ? 'Updating Password...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center mr-3">
              <DocumentText size={20} color="#475569" variant="Bold" />
            </View>
            <Text className="text-lg font-bold text-slate-800">Data Privacy</Text>
          </View>
          <Text className="text-sm text-slate-500 leading-relaxed mb-4">
            Your data is secured and managed in accordance with the Data Privacy Act of 2012. We only collect information necessary for emergency response dispatching.
          </Text>
          <TouchableOpacity className="border border-slate-200 rounded-xl py-3 items-center">
            <Text className="text-[#1E3A8A] font-bold text-base">Read Full Privacy Policy</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
