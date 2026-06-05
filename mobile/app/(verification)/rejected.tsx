import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Image, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { XCircle, AlertCircle, Camera, Upload, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadGovernmentID } from '../../lib/storage';

const ID_TYPES = ["National ID", "Passport", "Driver's License", "UMID", "Postal ID", "Other Valid ID"];

export default function RejectedVerificationScreen() {
  const { user } = useAuthStatus();
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [selectedIdType, setSelectedIdType] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleResubmit = async () => {
    if (!selectedIdType) {
      Alert.alert("Missing Info", "Please select your ID Card Type.");
      return;
    }
    if (!selectedImageUri) {
      Alert.alert("Missing Info", "Please select or capture your ID photo.");
      return;
    }
    if (!user?.id) return;

    setLoading(true);
    try {
      const filePath = await uploadGovernmentID(user.id, selectedImageUri);

      const { error } = await supabase
        .from('users')
        .update({
          id_type: selectedIdType,
          id_image_url: filePath,
          verification_status: 'PENDING',
          rejection_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("Success", "Your registration has been successfully resubmitted. Please wait for admin approval.");
      setIsResubmitting(false);
    } catch (err: any) {
      console.error('Error during resubmission:', err);
      Alert.alert("Error", err.message || "Failed to resubmit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const rejectionReason = user?.app_metadata?.rejection_reason || "Incomplete identity documents. Please ensure the photo is clear and all details are visible.";

  if (isResubmitting) {
    return (
      <View className="flex-1 bg-background p-6 justify-center">
        <Text className="text-2xl font-bold text-primary mb-2 text-center">Re-submit Documents</Text>
        <Text className="text-dark-grey text-center mb-8">Please upload a valid government-issued ID card to verify your identity.</Text>
        
        <View className="mb-6">
          <Text className="text-gray-700 font-bold mb-2 ml-1">Upload ID Card *</Text>
          <TouchableOpacity 
            onPress={pickImage}
            className="h-40 bg-white rounded-xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden"
          >
            {selectedImageUri ? (
              <Image 
                source={{ uri: selectedImageUri }} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="cover" 
              />
            ) : (
              <View className="items-center">
                <Camera color="#9CA3AF" size={32} />
                <Text className="text-gray-500 mt-2 font-medium">Tap to upload ID</Text>
                <Text className="text-gray-400 text-xs mt-1">JPEG/PNG, max 25MB</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View className="mb-8">
          <Text className="text-gray-700 font-bold mb-2 ml-1">ID Card Type *</Text>
          <TouchableOpacity 
            onPress={() => setShowIdTypeModal(true)}
            className="bg-white p-4 rounded-xl border border-gray-200 h-14 flex-row items-center justify-between"
          >
            <Text className={selectedIdType ? 'text-gray-800' : 'text-gray-400'}>
              {selectedIdType || "Select ID Type"}
            </Text>
            <ChevronDown color="#4B5563" size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleResubmit}
          disabled={loading}
          className="bg-primary p-4 w-full rounded-button items-center justify-center min-h-[56px]"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-bold text-lg">Submit Verification</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsResubmitting(false)}
          disabled={loading}
          className="mt-4 p-4 w-full border border-gray-300 rounded-button items-center justify-center min-h-[56px]"
        >
          <Text className="text-dark-grey font-bold text-lg">Cancel</Text>
        </TouchableOpacity>

        <Modal visible={showIdTypeModal} transparent animationType="fade">
          <TouchableOpacity 
            className="flex-1 bg-black/50 justify-end"
            activeOpacity={1} 
            onPress={() => setShowIdTypeModal(false)}
          >
            <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[60%]">
              <Text className="text-xl font-bold text-primary mb-4">Select ID Type</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {ID_TYPES.map((type) => (
                  <TouchableOpacity 
                    key={type}
                    className="py-4 border-b border-gray-100"
                    onPress={() => {
                      setSelectedIdType(type);
                      setShowIdTypeModal(false);
                    }}
                  >
                    <Text className={`text-lg ${selectedIdType === type ? 'text-primary font-bold' : 'text-gray-800'}`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background p-6 items-center justify-center">
      <View className="bg-secondary/10 p-8 rounded-full mb-6">
        <XCircle color="#EF4444" size={80} />
      </View>
      
      <Text className="text-3xl font-bold text-secondary text-center">
        Registration Rejected
      </Text>
      
      <View className="bg-surface p-6 rounded-card mt-8 w-full border border-secondary/20 shadow-sm">
        <View className="flex-row items-center mb-4">
          <AlertCircle color="#EF4444" size={24} />
          <Text className="text-secondary font-bold ml-2 text-lg">Reason for Rejection</Text>
        </View>
        <Text className="text-dark-grey leading-6 italic">
          "{rejectionReason}"
        </Text>
      </View>

      <Text className="text-dark-grey text-center mt-8 px-4">
        You can re-submit your registration with the correct documents through our mobile app or contact support.
      </Text>

      <TouchableOpacity
        onPress={() => setIsResubmitting(true)}
        className="bg-primary mt-12 p-4 w-full rounded-button items-center justify-center"
      >
        <Text className="text-white font-bold text-lg">Re-submit Documents</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleSignOut}
        className="mt-4 p-4 w-full border border-gray-300 rounded-button items-center justify-center"
      >
        <Text className="text-dark-grey font-bold text-lg">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

