import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft2, Lock1, DocumentText, CloseCircle } from 'iconsax-react-native';
import { supabase } from '../lib/supabase';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [privacyPolicy, setPrivacyPolicy] = useState(
    'Your data is secured and managed in accordance with the Data Privacy Act of 2012. We only collect information necessary for emergency response dispatching.'
  );
  const [loadingPolicy, setLoadingPolicy] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [privacyPolicyFull, setPrivacyPolicyFull] = useState(
    'DisasTRACE collects only the minimum data necessary for emergency response operations, including your name, contact number, location coordinates, and incident imagery. This data is used exclusively for dispatching ambulance responders and maintaining city-wide safety records.\n\nAll personal information is encrypted in transit and at rest using industry-standard TLS and AES-256 protocols. Access to your data is restricted to authorized CDRRMO personnel only. We do not sell, share, or distribute your personal information to any third parties.\n\nUnder the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to access, correct, and request deletion of your personal data. For any concerns, contact the CDRRMO Data Protection Officer through the Help & Support section.'
  );

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

  // Fetch the admin-configurable privacy policy text from the database
  useEffect(() => {
    async function fetchPrivacyPolicy() {
      try {
        const response = await fetch(`${apiUrl}/api/settings/support`);
        const data = await response.json();
        if (response.ok && data.success && data.support?.privacyPolicy) {
          setPrivacyPolicy(data.support.privacyPolicy);
        }
        if (response.ok && data.success && data.support?.privacyPolicyFull) {
          setPrivacyPolicyFull(data.support.privacyPolicyFull);
        }
      } catch (err) {
        console.warn('[PrivacySecurity] Failed to fetch privacy policy, using fallback:', err);
      } finally {
        setLoadingPolicy(false);
      }
    }
    fetchPrivacyPolicy();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid new password.');
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
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
          
          <View className="mb-4">
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

          <View className="mb-6">
            <Text className="text-sm font-semibold text-slate-700 mb-2">Confirm New Password</Text>
            <TextInput 
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
              placeholder="Re-enter new password"
            />
            {confirmPassword.length > 0 && newPassword !== confirmPassword && (
              <Text className="text-xs text-red-500 mt-1.5 font-medium">Passwords do not match</Text>
            )}
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
            <View className="flex-1 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-800">Data Privacy</Text>
              {loadingPolicy && <ActivityIndicator color="#1E3A8A" size="small" />}
            </View>
          </View>
          <Text className="text-sm text-slate-500 leading-relaxed mb-4">
            {privacyPolicy}
          </Text>
          <TouchableOpacity 
            className="border border-slate-200 rounded-xl py-3 items-center"
            onPress={() => setShowPolicyModal(true)}
          >
            <Text className="text-[#1E3A8A] font-bold text-base">Read Full Privacy Policy</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Full Privacy Policy Modal */}
      <Modal
        visible={showPolicyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View className="flex-1 bg-[#F8FAFC]">
          <View className="bg-[#1E3A8A] pt-16 pb-6 px-6 rounded-b-3xl">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-3">
                  <DocumentText size={22} color="#FFFFFF" variant="Bold" />
                </View>
                <Text className="text-xl font-bold text-white">Data Privacy Policy</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPolicyModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseCircle size={28} color="#FFFFFF" variant="Bold" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            className="flex-1 px-6 pt-6" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">DisasTRACE · CDRRMO Baliwag City</Text>
              <Text className="text-sm text-slate-700 leading-7">
                {privacyPolicy}
              </Text>
            </View>

            <View className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 mb-4">
              <Text className="text-xs font-bold text-[#1E3A8A] uppercase tracking-widest mb-3">Full Privacy Policy</Text>
              <Text className="text-sm text-slate-600 leading-7">
                {privacyPolicyFull}
              </Text>
            </View>

            <TouchableOpacity 
              className="bg-[#1E3A8A] rounded-xl py-4 items-center mt-2 mb-4"
              onPress={() => setShowPolicyModal(false)}
            >
              <Text className="text-white font-bold text-base">I Understand</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

