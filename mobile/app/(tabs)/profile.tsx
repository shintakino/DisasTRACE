import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StatusBar, Modal, Image, Alert, ActivityIndicator } from 'react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { supabase } from '../../lib/supabase';
import { Edit2, Logout, User, FolderOpen, Notification, MessageQuestion, Lock1, ArrowLeft2 } from 'iconsax-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '../../lib/storage';
import { useResponderStore } from '../../stores/useResponderStore';

export default function ProfileScreen() {
  const { user, role, profile } = useAuthStatus();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const router = useRouter();
  const isResponder = role === 'ambulance_responder';

  const [dbCount, setDbCount] = useState(0);
  const [dbActiveCount, setDbActiveCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const draftsLength = useResponderStore((state) => state.drafts.length);

  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;

    let isMounted = true;

    async function fetchCounts() {
      try {
        if (isResponder) {
          // Fetch submitted reports count
          const { data, error } = await supabase
            .from('reports')
            .select('id')
            .eq('responder_id', currentUserId);

          if (error) throw error;
          if (data && isMounted) {
            setDbCount(data.length);
          }

          // Fetch active (unresolved) incidents assigned to this responder
          const { data: activeIncidents, error: incError } = await supabase
            .from('incidents')
            .select('id')
            .eq('responder_id', currentUserId)
            .neq('status', 'RESOLVED');

          if (!incError && activeIncidents && isMounted) {
            setDbActiveCount(activeIncidents.length);
          }
        } else {
          // Fetch resident's incidents via verification requests to get accurate counts
          const { data: vRequests, error: vError } = await supabase
            .from('verification_requests')
            .select('id, status')
            .eq('resident_id', currentUserId);

          if (vError) throw vError;

          if (vRequests && vRequests.length > 0 && isMounted) {
            // Get all verification request IDs for this resident
            const vRequestIds = vRequests.map(v => v.id);

            // Fetch incidents linked to these verification requests
            const { data: incidentData, error: incError } = await supabase
              .from('incidents')
              .select('id, request_id, status')
              .in('request_id', vRequestIds);

            if (incError) throw incError;

            const totalIncidents = incidentData?.length || 0;
            // Active = incidents that are NOT resolved (still dispatched, en route, or arrived)
            const activeIncidents = incidentData?.filter(
              inc => inc.status !== 'RESOLVED'
            ).length || 0;

            setDbCount(totalIncidents);
            setDbActiveCount(activeIncidents);
          } else if (isMounted) {
            setDbCount(0);
            setDbActiveCount(0);
          }
        }
      } catch (err) {
        console.error('[ProfileScreen] Error fetching counts:', err);
      }
    }

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [user, role, draftsLength]);

  const handleSelectAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to update your profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadingAvatar(true);
      const selectedUri = result.assets[0].uri;

      // Upload with full image scaling & compression optimization
      await uploadAvatar(selectedUri);

      // Force-refresh session to pull down the newly updated avatar metadata url
      await supabase.auth.refreshSession();

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (err: any) {
      console.error('[ProfileScreen] Avatar update error:', err);
      Alert.alert('Upload Failed', err.message || 'An error occurred while uploading your profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    setLogoutVisible(false);
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = profile?.fullName ? getInitials(profile.fullName) : (isResponder ? 'RB' : 'EG');
  const displayName = profile?.fullName || (isResponder ? 'Renzy Bastes' : 'Eloisa Guibani');
  const barangayName = profile?.address?.split(',')[1]?.trim() || (profile?.address || 'Paitan');

  const renderPillRow = (Icon: any, title: string, subtitle: string, onPress?: () => void) => (
    <TouchableOpacity 
      className="bg-[#1E3A8A] rounded-3xl p-5 mb-4 flex-row items-center"
      onPress={onPress}
      activeOpacity={0.7}
    >
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
            <TouchableOpacity 
              className="bg-white/20 w-10 h-10 rounded-xl items-center justify-center mr-3"
              onPress={() => router.push('/personal-info')}
            >
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
          <View className="relative mr-5">
            <TouchableOpacity 
              onPress={handleSelectAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.7}
              className="w-24 h-24 rounded-full border border-white items-center justify-center overflow-hidden bg-white/10"
            >
              {user?.user_metadata?.avatar_url ? (
                <Image 
                  source={{ uri: user.user_metadata.avatar_url }} 
                  style={{ width: '100%', height: '100%', borderRadius: 48 }} 
                />
              ) : (
                <Text className="text-white text-3xl font-bold">{initials}</Text>
              )}
              
              {uploadingAvatar ? (
                <View className="absolute inset-0 bg-black/50 items-center justify-center">
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 left-0 bg-black/40 py-0.5 items-center">
                  <Text className="text-[9px] text-white font-bold uppercase tracking-wider">Edit</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full items-center justify-center">
              <View className="w-4 h-4 bg-[#1E3A8A] rounded-full" />
            </View>
          </View>

          <View className="flex-1 pr-4">
            <Text className="text-2xl font-bold text-white mb-2" numberOfLines={1}>{displayName}</Text>
            {isResponder ? (
              <View className="mt-1">
                <View className="flex-row items-center mb-2">
                  <Text className="text-sm text-blue-200 mr-2">Assigned Unit:</Text>
                  <Text className="text-base font-bold text-white">AMB-001</Text>
                </View>
                <View className="flex-row">
                  <View className="bg-green-500/20 px-2 py-1 rounded border border-green-400 flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-green-400 mr-1.5" />
                    <Text className="text-green-400 text-[10px] font-bold uppercase tracking-wider">On Duty</Text>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text className="text-sm text-blue-200">Barangay</Text>
                <Text className="text-base font-bold text-white mb-2">{barangayName}</Text>
                <Text className="text-sm text-blue-200">Date Joined</Text>
                <Text className="text-base font-bold text-white">March 27, 2025</Text>
              </>
            )}
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
        {renderPillRow(User, 'Personal Information', 'Name, contact, emergency details...', () => router.push('/personal-info'))}
        {renderPillRow(
          FolderOpen, 
          'My Reports', 
          isResponder 
            ? `${dbCount + draftsLength} total · ${dbActiveCount + draftsLength} active` 
            : `${dbCount} total · ${dbActiveCount} active`, 
          () => router.push('/(tabs)/reports')
        )}
        
        <Text className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 mt-6">SETTINGS</Text>
        {renderPillRow(Notification, 'Notifications', 'Alerts, emergency updates', () => router.push('/notification-settings'))}
        {renderPillRow(MessageQuestion, 'Help & Support', 'FAQs, contact CDRRMO Baliwag', () => router.push('/support'))}
        {renderPillRow(Lock1, 'Privacy & Security', 'Password, data sharing', () => router.push('/privacy-security'))}
        
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
