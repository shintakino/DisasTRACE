import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema, PasswordType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';
import { Eye, EyeSlash, TickSquare } from 'iconsax-react-native';
import { fetchWithTimeout } from '../../lib/network-timeout';

const FALLBACK_PRIVACY_POLICY = 'DisasTRACE collects only the personal information necessary to verify your account and coordinate emergency response. Authorized CDRRMO personnel may use your identity, callback number, location, and submitted evidence for these purposes under the Data Privacy Act of 2012.';

interface Props {
  onRegister: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function Step4({ onRegister, onBack, isLoading }: Props) {
  const { updateData } = useSignUpStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState(FALLBACK_PRIVACY_POLICY);
  const [privacyPolicyVersion, setPrivacyPolicyVersion] = useState('fallback-2026-09-16');
  const [policyLoading, setPolicyLoading] = useState(true);
  const [policyError, setPolicyError] = useState<string | null>(null);
  
  const { control, handleSubmit, formState: { errors, isValid } } = useForm<PasswordType>({
    resolver: zodResolver(PasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
      termsAccepted: false as any, // initial false
    }
  });

  const loadPrivacyPolicy = async () => {
    setPolicyLoading(true);
    setPolicyError(null);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetchWithTimeout(`${apiUrl}/api/settings/support`, {}, 10_000, 'privacy policy');
      const payload = await response.json();
      if (!response.ok || !payload?.support?.privacyPolicyFull) throw new Error('The latest policy could not be loaded.');
      setPrivacyPolicy(payload.support.privacyPolicyFull);
      setPrivacyPolicyVersion(String(payload.support.updatedAt || 'current'));
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : 'The latest policy could not be loaded.');
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => { void loadPrivacyPolicy(); }, []);

  const onSubmit = (stepData: PasswordType) => {
    updateData({
      password: stepData.password,
      confirmPassword: stepData.confirmPassword,
      termsAccepted: stepData.termsAccepted,
      privacyConsentAt: new Date().toISOString(),
      privacyPolicyVersion,
    });
    onRegister();
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Create Password *</Text>
        <View className="relative justify-center">
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-50 p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} h-14 pr-12 text-gray-800`}
              placeholder="At least 8 characters" onBlur={onBlur} onChangeText={onChange} value={value}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
          )} />
          <TouchableOpacity 
            className="absolute right-2 p-2 h-10 w-10 items-center justify-center"
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? <Eye color="#4B5563" size={20} /> : <EyeSlash color="#4B5563" size={20} />}
          </TouchableOpacity>
        </View>
        {errors.password && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.password.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Confirm Password *</Text>
        <View className="relative justify-center">
          <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-50 p-4 rounded-xl border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} h-14 pr-12 text-gray-800`}
              placeholder="Re-enter password" onBlur={onBlur} onChangeText={onChange} value={value}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
          )} />
          <TouchableOpacity 
            className="absolute right-2 p-2 h-10 w-10 items-center justify-center"
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showConfirmPassword ? <Eye color="#4B5563" size={20} /> : <EyeSlash color="#4B5563" size={20} />}
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.confirmPassword.message}</Text>}
      </View>

      <View className="mt-4">
        <Controller control={control} name="termsAccepted" render={({ field: { onChange, value } }) => (
          <TouchableOpacity 
            className="flex-row items-center mt-2 pr-4"
            onPress={() => onChange(!value)}
          >
            <View className={`w-6 h-6 rounded border ${value ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'border-gray-300'} items-center justify-center mr-3`}>
              {value && <TickSquare color="#FFFFFF" size={16} variant="Bold" />}
            </View>
            <Text className="text-gray-600 flex-1">
              I have read and agree to the Terms and Conditions and Data Privacy Policy.
            </Text>
          </TouchableOpacity>
        )} />
        {errors.termsAccepted && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.termsAccepted.message}</Text>}
        <TouchableOpacity className="mt-3 self-start rounded-lg border border-blue-200 bg-blue-50 px-3 py-2" onPress={() => setShowPrivacyPolicy(true)}>
          <Text className="font-bold text-[#1E3A8A]">Read Data Privacy Policy</Text>
        </TouchableOpacity>
        {policyError ? (
          <View className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <Text className="text-sm text-amber-900">{policyError} The built-in emergency privacy notice is shown instead.</Text>
            <TouchableOpacity onPress={() => void loadPrivacyPolicy()} className="mt-2"><Text className="font-bold text-[#1E3A8A]">Retry policy download</Text></TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View className="flex-row gap-4 mt-8">
        <TouchableOpacity
          onPress={onBack}
          disabled={isLoading}
          className="flex-1 bg-white border border-gray-200 rounded-xl items-center justify-center min-h-[56px]"
        >
          <Text className="text-gray-700 font-bold text-lg">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading || !isValid || policyLoading}
          accessibilityState={{ disabled: isLoading || !isValid || policyLoading }}
          className={`flex-1 bg-[#1E3A8A] rounded-xl items-center justify-center min-h-[56px] ${isLoading || !isValid || policyLoading ? 'opacity-50' : ''}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Register</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showPrivacyPolicy} transparent animationType="slide" onRequestClose={() => setShowPrivacyPolicy(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[85%] rounded-t-3xl bg-white p-6">
            <Text className="text-xl font-bold text-[#1E3A8A]">Data Privacy Policy</Text>
            <Text className="mt-1 text-sm text-slate-500">Read this notice before giving consent.</Text>
            <ScrollView className="mt-4" showsVerticalScrollIndicator>
              <Text className="pb-6 text-base leading-6 text-slate-700">{privacyPolicy}</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowPrivacyPolicy(false)} className="mt-4 min-h-[52px] items-center justify-center rounded-xl bg-[#1E3A8A]">
              <Text className="font-bold text-white">Close Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
