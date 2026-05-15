import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useSignUp, useClerk } from '@clerk/expo';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { useSignUpStore } from '../../store/useSignUpStore';
import { ArrowLeft, UserTick } from 'iconsax-react-native';

import Step1 from '../../components/auth/Step1';
import Step2 from '../../components/auth/Step2';
import Step3 from '../../components/auth/Step3';
import Step4 from '../../components/auth/Step4';

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const { loaded: isLoaded } = useClerk();
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { data, reset } = useSignUpStore();

  const handleRegister = async () => {
    if (!isLoaded || !signUp) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create user in Clerk
      const { error: signUpError } = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        unsafeMetadata: {
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // In Core 3, we check the status after creation
      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            setShowSuccessModal(true);
            return; // Modal handles navigation
          },
        });
      } else {
        // Handle other statuses (like verification needed)
        // For now, mirroring the specified wizard completion
        setShowSuccessModal(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
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
    <View className="flex-1 bg-white pt-10">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else router.back();
          }}
          className="p-2 -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color="#1F2937" size={24} />
        </TouchableOpacity>
        <Text className="flex-1 text-center font-bold text-lg text-gray-800 mr-8">Create Account</Text>
      </View>

      {/* Progress Bar */}
      <View className="w-full bg-gray-100 h-2">
        <View 
          className="bg-[#EF4444] h-full" 
          style={{ width: `${progressPercentage}%` }} 
        />
      </View>

      <ScrollView className="flex-1 px-6 py-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="mb-6 flex-row justify-between items-end">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-bold text-[#1E3A8A] mb-1">
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Contact Details"}
              {currentStep === 3 && "Verification"}
              {currentStep === 4 && "Password"}
            </Text>
            <Text className="text-gray-500">
              {currentStep === 1 && "Please provide your basic details."}
              {currentStep === 2 && "How can we reach you?"}
              {currentStep === 3 && "Help us verify your identity."}
              {currentStep === 4 && "Secure your account."}
            </Text>
          </View>
          <Text className="font-bold text-gray-400">Step {currentStep}/4</Text>
        </View>

        {error && (
          <View className="bg-red-50 p-3 rounded-lg mb-6 border border-red-200">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        )}

        <View className="pb-10">
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
    </View>
  );
}