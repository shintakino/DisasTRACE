import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2 } from 'iconsax-react-native';
import { useAuthStatus } from '../hooks/use-auth-status';
import { supabase } from '../lib/supabase';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, role, profile, refreshStatus } = useAuthStatus();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize form details
  useEffect(() => {
    if (user) {
      setFirstName(user.user_metadata?.first_name || profile?.fullName?.split(' ')[0] || '');
      setLastName(user.user_metadata?.last_name || profile?.fullName?.split(' ').slice(1).join(' ') || '');
      setPhone(user.user_metadata?.phone || '');
      setEmail(user.email || '');
    }
  }, [user, profile]);

  const handleSaveChanges = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'First name and Last name are required.');
      return;
    }

    if (role === 'ambulance_responder' && !email.trim()) {
      Alert.alert('Validation Error', 'Email address is required.');
      return;
    }

    setLoading(true);
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // Standard Android emulator localhost route fallback

    try {
      // Get the current session to extract JWT
      const { data: { session } } = await supabase.auth.getSession();
      const reqHeaders: any = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${apiUrl}/api/users/profile`, {
        method: 'PATCH',
        headers: reqHeaders,
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: role === 'ambulance_responder' ? email.trim() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile details.');
      }

      // Dynamic refresh of client states
      await refreshStatus();

      Alert.alert('Success', 'Your personal details have been updated successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error('[PersonalInfo] Error updating details:', err);
      Alert.alert('Error', err.message || 'Connection failed. Please verify your networking.');
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
          <Text className="text-2xl font-bold text-white">Personal Info</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Profile Details</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">First Name</Text>
              <TextInput 
                value={firstName}
                onChangeText={setFirstName}
                editable={!loading}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your first name"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Last Name</Text>
              <TextInput 
                value={lastName}
                onChangeText={setLastName}
                editable={!loading}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your last name"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Phone Number</Text>
              <TextInput 
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your phone number"
              />
            </View>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Account Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-semibold text-[#334155] mb-2">Email Address</Text>
              {role === 'ambulance_responder' ? (
                <TextInput 
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                  placeholder="Enter your email address"
                />
              ) : (
                <Text className="text-base font-semibold text-slate-800 ml-1">{user?.email || 'No email provided'}</Text>
              )}
            </View>
            
            <View className="mb-2">
              <Text className="text-sm text-slate-500 mb-1">Role / Affiliation</Text>
              <Text className="text-base font-semibold text-slate-800 capitalize">
                {role ? role.replace('_', ' ') : 'Resident'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-[#1E3A8A] rounded-2xl py-4 items-center shadow-md mb-10 flex-row justify-center"
            onPress={handleSaveChanges}
            disabled={loading}
          >
            {loading && <ActivityIndicator color="white" size="small" className="mr-2" />}
            <Text className="text-white font-bold text-lg">
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
