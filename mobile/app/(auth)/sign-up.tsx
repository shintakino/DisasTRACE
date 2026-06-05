import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignUpStore } from '../../store/useSignUpStore';
import { ArrowLeft, UserTick } from 'iconsax-react-native';
import { uploadGovernmentID } from '../../lib/storage';

import Step1 from '../../components/auth/Step1';
import Step2 from '../../components/auth/Step2';
import Step3 from '../../components/auth/Step3';
import Step4 from '../../components/auth/Step4';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const role = (params.role as string) || 'public_user';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAutoConfirmed, setIsAutoConfirmed] = useState(false);
  const { data, reset, updateData } = useSignUpStore();

  // Synchronize dynamic search param role into the Zustand store on mount
  useEffect(() => {
    if (role) {
      updateData({ role: role as any });
    }
  }, [role]);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch latest data from Zustand
      const currentData = useSignUpStore.getState().data;

      // Comprehensive validation check to ensure all steps were completed correctly
      const requiredFields = [
        { key: 'email', label: 'Email' },
        { key: 'password', label: 'Password' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Surname' },
        { key: 'mobileNumber', label: 'Mobile Number' },
        { key: 'province', label: 'Province' },
        { key: 'city', label: 'City' },
        { key: 'barangay', label: 'Barangay' },
        { key: 'street', label: 'Street' },
        { key: 'idCardUri', label: 'ID Photo' },
        { key: 'idCardType', label: 'ID Type' }
      ];

      for (const field of requiredFields) {
        if (!currentData[field.key as keyof typeof currentData]) {
          throw new Error(`Registration data is incomplete: ${field.label} is missing.`);
        }
      }

      // 1. Create user in Supabase Auth
      // Role and names are passed in user_metadata for the trigger to pick up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: currentData.email || '',
        password: currentData.password || '',
        options: {
          data: {
            first_name: currentData.firstName,
            last_name: currentData.lastName,
            full_name: `${currentData.firstName} ${currentData.lastName}`,
            role: currentData.role,
            phone: currentData.mobileNumber,
            address: `${currentData.street}, ${currentData.barangay}, ${currentData.city}, ${currentData.province}`,
            id_type: currentData.idCardType,
          }
        }
      });

      console.log('SignUp Response Data:', JSON.stringify(signUpData, null, 2));
      
      if (signUpError) {
        // Handle case where user already exists
        if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw signUpError;
      }

      // If no user and no error, it usually means the user is already registered but unconfirmed
      // (Supabase returns this to prevent account enumeration when email confirmation is ON)
      if (!signUpData.user) {
        throw new Error('This email is already registered or requires confirmation. Please check your inbox.');
      }

      const userId = signUpData.user.id;
      if (!userId) throw new Error('Sign up failed: User ID missing');

      // 2. Upload ID to Supabase Storage if provided
      // Note: If email confirmation is required, signUpData.session will be null.
      // RLS policies for storage might require authentication.
      if (signUpData.session) {
        setIsAutoConfirmed(true);
      }

      if (currentData.idCardUri) {
        if (!signUpData.session) {
          console.warn('User is unauthenticated (email confirmation required). Skipping ID upload for now.');
          // We still show success, but maybe add a note later that they'll need to upload ID after login.
          // For now, we proceed to show the success modal.
        } else {
          try {
            const filePath = await uploadGovernmentID(userId, currentData.idCardUri);

            await supabase
              .from('users')
              .update({ 
                id_image_url: filePath, // Store path, not public URL
              })
              .eq('id', userId);
          } catch (uploadErr: any) {
            console.error('Error handling ID upload:', uploadErr);
            // We don't want to block the whole process if just the ID upload fails, 
            // but we should probably inform the user.
          }
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <LinearGradient colors={['#0A1332', '#15286A']} className="flex-1 pt-10">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1);
              } else {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/sign-in');
                }
              }
            }}
            className="p-2 -ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
          
          <View className="flex-1 items-center justify-center mr-8 flex-row space-x-2">
            <Text className="font-bold text-lg text-white">Create Account</Text>
            <View className={`px-2.5 py-0.5 rounded-full border ${
              role === 'ambulance_responder' 
                ? 'bg-red-500/20 border-red-500/30' 
                : 'bg-blue-500/20 border-blue-500/30'
            }`}>
              <Text className={`text-[10px] font-black tracking-widest uppercase ${
                role === 'ambulance_responder' ? 'text-red-400' : 'text-blue-400'
              }`}>
                {role === 'ambulance_responder' ? 'Responder' : 'Resident'}
              </Text>
            </View>
          </View>
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
                {isAutoConfirmed 
                  ? "Your account has been successfully created! You may now log in." 
                  : "We've sent a verification email to your address. Please confirm your email before logging in."}
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
