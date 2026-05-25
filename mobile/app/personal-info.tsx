import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2 } from 'iconsax-react-native';
import { useAuthStatus } from '../hooks/use-auth-status';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { user, role } = useAuthStatus();
  
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || '');
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || '');
  const [phone, setPhone] = useState(user?.user_metadata?.phone || '');

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
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your first name"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Last Name</Text>
              <TextInput 
                value={lastName}
                onChangeText={setLastName}
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your phone number"
              />
            </View>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Account Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm text-slate-500 mb-1">Email Address</Text>
              <Text className="text-base font-semibold text-slate-800">{user?.email || 'No email provided'}</Text>
            </View>
            
            <View className="mb-2">
              <Text className="text-sm text-slate-500 mb-1">Role / Affiliation</Text>
              <Text className="text-base font-semibold text-slate-800 capitalize">
                {role ? role.replace('_', ' ') : 'Resident'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-[#1E3A8A] rounded-2xl py-4 items-center shadow-md mb-10"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
