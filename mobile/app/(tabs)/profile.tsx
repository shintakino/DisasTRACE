import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StatusBar, Modal, Image } from 'react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { supabase } from '../../lib/supabase';
import { Edit2, Logout, User, FolderOpen, Notification, MessageQuestion, Lock1, ArrowLeft2 } from 'iconsax-react-native';

export default function ProfileScreen() {
  const { user } = useAuthStatus();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleSignOut = async () => {
    setLogoutVisible(false);
    await supabase.auth.signOut();
  };

  const renderPillRow = (Icon: any, title: string, subtitle: string) => (
    <TouchableOpacity className="bg-[#1E3A8A] rounded-3xl p-5 mb-4 flex-row items-center">
      <View className="bg-white w-12 h-12 rounded-2xl items-center justify-center mr-4">
        <Icon size={24} color="#1E3A8A" variant="Bold" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-bold">{title}</Text>
        <Text className="text-blue-200 text-sm mt-0.5">{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="bg-[#1E3A8A] px-6 pb-8 overflow-hidden" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60 }}>
        
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-2xl font-bold text-white">My Profile</Text>
          <View className="flex-row">
            <TouchableOpacity className="bg-white/20 w-10 h-10 rounded-xl items-center justify-center mr-3">
              <Edit2 size={20} color="#FFFFFF" variant="Bold" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="bg-white/20 w-10 h-10 rounded-xl items-center justify-center"
              onPress={() => setLogoutVisible(true)}
            >
              <Logout size={20} color="#FFFFFF" variant="Linear" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center relative z-10">
          <View className="w-24 h-24 rounded-full border border-white items-center justify-center mr-5">
            <Text className="text-white text-3xl font-bold">EG</Text>
            <View className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full items-center justify-center">
              <View className="w-4 h-4 bg-[#1E3A8A] rounded-full" />
            </View>
          </View>
          <View>
            <Text className="text-2xl font-bold text-white mb-2">Eloisa Guibani</Text>
            <Text className="text-sm text-blue-200">Barangay</Text>
            <Text className="text-base font-bold text-white mb-2">Paitan</Text>
            <Text className="text-sm text-blue-200">Date Joined</Text>
            <Text className="text-base font-bold text-white">March 27, 2025</Text>
          </View>
        </View>

        <View className="absolute -bottom-2 -right-4 opacity-40">
          <Image 
            source={require('../../assets/images/DisasTRACELogo.png')} 
            style={{ width: 150, height: 40, resizeMode: 'contain' }} 
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-8" showsVerticalScrollIndicator={false}>
        <Text className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">ACCOUNT</Text>
        {renderPillRow(User, 'Personal Information', 'Name, address, contact...')}
        {renderPillRow(FolderOpen, 'My Reports', '3 total · 1 active')}
        
        <Text className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 mt-6">SETTINGS</Text>
        {renderPillRow(Notification, 'Notifications', 'Alerts, emergency updates')}
        {renderPillRow(MessageQuestion, 'Help & Support', 'FAQs, contact CDRRMO Baliwag')}
        {renderPillRow(Lock1, 'Privacy & Security', 'Password, data sharing')}
        
        <View className="h-24" />
      </ScrollView>

      <Modal visible={logoutVisible} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/40 justify-center items-center px-6">
          <View className="bg-white rounded-[32px] w-full p-8 items-center shadow-xl">
            
            <View className="mb-6 relative w-20 h-20 items-center justify-center flex-row">
              <ArrowLeft2 size={40} color="#1E3A8A" variant="Bold" className="absolute left-0 z-10" />
              <View className="w-12 h-16 bg-[#1E3A8A] rounded-r-3xl rounded-l-md ml-4" />
            </View>

            <Text className="text-2xl font-black text-[#1E3A8A] mb-2">Log Out</Text>
            <Text className="text-base text-slate-500 text-center mb-8 px-2 font-medium">
              Are you sure you want to log out your account?
            </Text>

            <View className="flex-row w-full justify-between">
              <TouchableOpacity 
                className="flex-1 bg-[#B91C1C] py-4 rounded-2xl items-center mr-2 shadow-sm"
                onPress={() => setLogoutVisible(false)}
              >
                <Text className="text-white text-lg font-bold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-[#1E3A8A] py-4 rounded-2xl items-center ml-2 shadow-sm"
                onPress={handleSignOut}
              >
                <Text className="text-white text-lg font-bold">Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
