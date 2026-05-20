import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignUpStore } from '../../store/useSignUpStore';
import { ArrowLeft, UserTick } from 'iconsax-react-native';
import { File } from 'expo-file-system';

import Step1 from '../../components/auth/Step1';
import Step2 from '../../components/auth/Step2';
import Step3 from '../../components/auth/Step3';
import Step4 from '../../components/auth/Step4';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as string) || 'public_user';
  const initialRole = role;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { data, reset } = useSignUpStore();

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch latest data from Zustand
      const currentData = useSignUpStore.getState().data;

      if (!currentData.email || !currentData.password) {
        throw new Error('Registration data is incomplete. Please ensure email and password are set.');
      }

      // 1. Create user in Supabase Auth
      // Role and names are passed in user_metadata for the trigger to pick up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: currentData.email,
        password: currentData.password,
        options: {
          data: {
            first_name: currentData.firstName,
            last_name: currentData.lastName,
            full_name: `${currentData.firstName} ${currentData.lastName}`,
            role: currentData.role,
            phone: currentData.mobileNumber,
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Sign up failed: No user returned');
      }

      const userId = signUpData.user.id;
      if (!userId) throw new Error('Sign up failed: User ID missing');

      // 2. Upload ID to Supabase Storage if provided
      if (currentData.idCardUri) {
        try {
          const fileExt = currentData.idCardUri.split('.').pop() || 'jpg';
          const fileName = `${userId}/${Date.now()}.${fileExt}`;

          const file = new File(currentData.idCardUri);
          const arrayBuffer = await file.arrayBuffer();

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ids')
            .upload(fileName, arrayBuffer, {
              contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
            });

          if (uploadError) {
            console.warn(`ID Upload failed: ${uploadError.message}`);
          } else if (uploadData) {
            // 3. Update public profile with ID image URL
            const { data: publicUrlData } = supabase.storage
              .from('ids')
              .getPublicUrl(uploadData.path);

            await supabase
              .from('users')
              .update({ 
                id_image_url: publicUrlData.publicUrl,
                id_type: currentData.idCardType,
                address: `${currentData.street}, ${currentData.barangay}, ${currentData.city}, ${currentData.province}`,
                phone: currentData.mobileNumber
              })
              .eq('id', userId);
          }
        } catch (uploadErr) {
          console.error('Error handling ID upload:', uploadErr);
          // Don't fail the whole registration if just the image upload fails, 
          // but maybe log it or notify the user later.
        }
      }

      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNextSuccess = () => {
    setShowSuccessModal(false);
    reset();
    router.replace('/(auth)/sign-in');
  };

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <LinearGradient colors={['#0A1332', '#15286A']} className="flex-1 pt-10">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center">
          <TouchableOpacity 
            onPress={() => {
              if (currentStep > 1) setCurrentStep(currentStep - 1);
              else router.back();
            }}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          <Text className="flex-1 text-center font-bold text-lg text-white mr-8">Create Account</Text>
        </View>

        {/* Progress Bar */}
        <View className="w-full bg-white/20 h-2">
          <View 
            className="bg-[#EF4444] h-full" 
            style={{ width: `${progressPercentage}%` }} 
          />
        </View>

        <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="mb-6 flex-row justify-between items-end">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-white mb-1">
                {currentStep === 1 && "Personal Information"}
                {currentStep === 2 && "Contact Details"}
                {currentStep === 3 && "Verification"}
                {currentStep === 4 && "Password"}
              </Text>
              <Text className="text-gray-300">
                {currentStep === 1 && "Please provide your basic details."}
                {currentStep === 2 && "How can we reach you?"}
                {currentStep === 3 && "Help us verify your identity."}
                {currentStep === 4 && "Secure your account."}
              </Text>
            </View>
            <Text className="font-bold text-gray-400">Step {currentStep}/4</Text>
          </View>

          {error && (
            <View className="bg-red-500/20 p-3 rounded-lg mb-6 border border-red-500/50">
              <Text className="text-red-100 text-center">{error}</Text>
            </View>
          )}

          <View className="bg-white rounded-t-3xl mt-4 px-6 pt-8 pb-10">
            {currentStep === 1 && <Step1 onNext={() => setCurrentStep(2)} />}
            {currentStep === 2 && <Step2 onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />}
            {currentStep === 3 && <Step3 onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />}
            {currentStep === 4 && <Step4 onRegister={handleRegister} onBack={() => setCurrentStep(3)} isLoading={loading} />}
          </View>
        </ScrollView>

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <View className="bg-white rounded-3xl p-8 w-full items-center">
              <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                <UserTick color="#10B981" size={40} variant="Bulk" />
              </View>
              <Text className="text-2xl font-bold text-[#1E3A8A] mb-2 text-center">Account Created</Text>
              <Text className="text-gray-500 text-center mb-8 leading-6">
                Your account has been successfully created! You may now log in.
              </Text>
              <TouchableOpacity
                onPress={handleNextSuccess}
                className="bg-[#1E3A8A] w-full p-4 rounded-xl items-center justify-center min-h-[56px]"
              >
                <Text className="text-white font-bold text-lg">Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
