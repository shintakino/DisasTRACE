import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { signOutFromMobile } from '../../lib/mobile-auth';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeSlash, ArrowLeft, ShieldTick } from 'iconsax-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

// Strict Zod Validation Schema
const ResetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .refine((val) => /[A-Z]/.test(val), {
      message: 'Password must contain at least one uppercase letter',
    })
    .refine((val) => /[^A-Za-z0-9]/.test(val), {
      message: 'Password must contain at least one special character',
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

type ResetPasswordType = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { phone, token, access_token, refresh_token, code } = useLocalSearchParams<{
    phone?: string;
    token?: string;
    access_token?: string;
    refresh_token?: string;
    code?: string;
  }>();
  const isOtpFlow = !!(phone && token);
  const url = Linking.useURL();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(isOtpFlow);

  // Success Modal & Redirect
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Capture and process both Supabase recovery link formats. Depending on the
  // project auth settings, Supabase can send either hash tokens or a PKCE code.
  useEffect(() => {
    if (isOtpFlow) return;

    const parseUrlValue = (source: string | null | undefined, key: string) => {
      if (!source) return undefined;
      const match = source.match(new RegExp(`(?:[?#&])${key}=([^&#]*)`));
      return match?.[1] ? decodeURIComponent(match[1]) : undefined;
    };

    async function handleRecoveryLink() {
      setIsVerifyingLink(true);
      setGlobalError(null);

      try {
        const existing = await supabase.auth.getSession();
        let session = existing.data.session;
        const parsed = url ? Linking.parse(url) : { queryParams: {} };
        const queryParams = (parsed.queryParams ?? {}) as Record<string, string | undefined>;
        const accessToken = (queryParams.access_token as string | undefined) || access_token || parseUrlValue(url, 'access_token');
        const refreshToken = (queryParams.refresh_token as string | undefined) || refresh_token || parseUrlValue(url, 'refresh_token');
        const recoveryCode = (queryParams.code as string | undefined) || code || parseUrlValue(url, 'code');

        if (!session && accessToken && refreshToken) {
          const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (result.error) throw result.error;
          session = result.data.session;
        } else if (!session && recoveryCode) {
          const result = await supabase.auth.exchangeCodeForSession(recoveryCode);
          if (result.error) throw result.error;
          session = result.data.session;
        }

        if (!session) {
          throw new Error('Open the password reset link from your email before saving a new password.');
        }

        setRecoveryReady(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (error) {
        console.error('[ResetPassword] Recovery session setup failed:', error);
        setRecoveryReady(false);
        setGlobalError(error instanceof Error ? error.message : 'The reset link is invalid or has expired.');
      } finally {
        setIsVerifyingLink(false);
      }
    }

    void handleRecoveryLink();
  }, [access_token, code, isOtpFlow, refresh_token, url]);

  // Success Redirect Countdown Timer
  useEffect(() => {
    let timer: any;
    if (showSuccessModal) {
      if (countdown > 0) {
        timer = setTimeout(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        // Safe redirect to sign-in screen
        router.replace('/(auth)/sign-in' as any);
      }
    }
    return () => clearTimeout(timer);
  }, [showSuccessModal, countdown]);

  const onSubmit = async (data: ResetPasswordType) => {
    setGlobalError(null);

    try {
      if (isOtpFlow) {
        // OTP Flow: Hit backend REST API
        const apiUrl = process.env.EXPO_PUBLIC_MOBILE_API_URL || 'https://disas-trace.vercel.app/api';
        const response = await fetch(`${apiUrl}/auth/otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reset',
            phone,
            token,
            password: data.password,
          }),
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(resData.error || 'Failed to reset password via OTP.');
        }

      } else {
        // Email Link Flow: Client-side Supabase password update
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Your reset link is no longer active. Request a new password reset link and open it from your email.');
        }
        const { error: supabaseError } = await supabase.auth.updateUser({
          password: data.password
        });

        if (supabaseError) {
          throw supabaseError;
        }
      }

      // Success sequence
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      // Sign out any active sessions to secure the account and trigger fresh login
      await signOutFromMobile().catch(() => {});

      setShowSuccessModal(true);

    } catch (err: any) {
      setGlobalError(err.message || 'An error occurred during password reset.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <LinearGradient colors={['#0A1332', '#15286A']} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 p-6 justify-center mt-10">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(auth)/sign-in');
                }
              }}
              className="absolute top-10 left-6 p-2 z-10"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft color="#FFFFFF" size={28} />
            </TouchableOpacity>

            <View className="mb-10 items-center">
              <View className="w-20 h-20 items-center justify-center bg-white/10 rounded-full mb-6 border border-white/20">
                <ShieldTick color="#FFFFFF" size={40} />
              </View>
              <Text className="text-3xl font-bold text-white mb-2 text-center">Reset Password</Text>
              <Text className="text-white/80 text-center text-base px-4">
                Please enter and confirm your new secure password below.
              </Text>
            </View>

            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <View className="space-y-4">
                {/* New Password Input */}
                <View>
                  <Text className="text-gray-700 font-bold mb-2 ml-1">New Password</Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="relative">
                        <TextInput
                          className={`bg-gray-50 p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} pr-12 text-gray-800`}
                          placeholder="At least 8 characters"
                          placeholderTextColor="#64748B"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          editable={!isSubmitting && !isVerifyingLink}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-4"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          {showPassword ? (
                            <EyeSlash size={20} color="#9CA3AF" />
                          ) : (
                            <Eye size={20} color="#9CA3AF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.password && <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">{errors.password.message}</Text>}
                </View>

                {/* Confirm Password Input */}
                <View className="mt-4">
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Confirm Password</Text>
                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="relative">
                        <TextInput
                          className={`bg-gray-50 p-4 rounded-xl border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} pr-12 text-gray-800`}
                          placeholder="Re-enter new password"
                          placeholderTextColor="#64748B"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          editable={!isSubmitting && !isVerifyingLink}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-4"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          {showConfirmPassword ? (
                            <EyeSlash size={20} color="#9CA3AF" />
                          ) : (
                            <Eye size={20} color="#9CA3AF" />
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                  {errors.confirmPassword && <Text className="text-red-500 text-sm mt-1 ml-1 font-medium">{errors.confirmPassword.message}</Text>}
                </View>
              </View>

              {globalError && (
                <View className="bg-red-50 p-3 rounded-lg mb-4 mt-4 border border-red-200">
                  <Text className="text-red-600 text-center text-sm font-medium">{globalError}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting || isVerifyingLink || (!isOtpFlow && !recoveryReady)}
                className={`mt-8 bg-[#15286A] p-4 rounded-xl items-center justify-center min-h-[56px] ${(isSubmitting || isVerifyingLink || (!isOtpFlow && !recoveryReady)) ? 'opacity-70' : ''}`}
              >
                {isVerifyingLink ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white font-bold ml-2 text-lg">Verifying link...</Text>
                  </View>
                ) : isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Save Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Gorgeous Glowing Shield Check Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 items-center justify-center bg-[#0A1332]/95 p-6">
          <View className="items-center justify-center">
            {/* Glowing Green Shield Outer Circle */}
            <View className="w-24 h-24 rounded-full bg-green-500/10 items-center justify-center border-2 border-green-500 mb-6">
              <ShieldTick color="#10B981" size={48} variant="Bold" />
            </View>

            <Text className="text-3xl font-extrabold text-white text-center mb-2">Password Reset!</Text>
            <Text className="text-white/60 text-center text-base mb-8 px-6">
              Your password has been successfully updated. All active sessions have been safely logged out.
            </Text>

            {/* Glowing countdown text */}
            <View className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl flex-row items-center">
              <ActivityIndicator color="#10B981" size="small" />
              <Text className="text-white/80 font-medium ml-3">
                Redirecting to login in <Text className="text-[#10B981] font-bold">{countdown}s</Text>
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
