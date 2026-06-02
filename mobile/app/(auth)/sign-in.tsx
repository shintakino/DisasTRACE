import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginType } from '../../schemas/auth';
import { Eye, EyeSlash, ArrowLeft } from 'iconsax-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignInScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { identifier: '', password: '' }
  });

  const onSubmit = async (data: LoginType) => {
    setGlobalError(null);

    try {
      let emailToUse = data.identifier.trim();

      // If the identifier doesn't look like an email, treat it as a phone number
      if (!emailToUse.includes('@')) {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
        try {
          const response = await fetch(`${apiUrl}/api/auth/resolve-phone`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: emailToUse }),
          });

          const result = await response.json();
          if (response.ok && result.success && result.email) {
            emailToUse = result.email;
          } else {
            setGlobalError(result.error || "No account found associated with this mobile number.");
            return;
          }
        } catch (fetchErr) {
          console.error("Error resolving phone number:", fetchErr);
          setGlobalError("Connection error. Could not resolve mobile number.");
          return;
        }
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed') || error.message.includes('not verified')) {
          setGlobalError("Your email has not been verified yet. Please check your inbox and confirm your address before logging in.");
        } else {
          setGlobalError(error.message);
        }
        return;
      }

      if (signInData.user) {
        // Auth state change will handle routing in root layout
        router.replace('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setGlobalError(message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <LinearGradient colors={['#0A1332', '#15286A']} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 p-6 justify-center mt-10">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute top-10 left-6 p-2 z-10"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft color="#FFFFFF" size={28} />
          </TouchableOpacity>

          <View className="mb-10 items-center">
            <Image 
              source={require('../../assets/images/DisasTRACELogo.png')} 
              className="w-24 h-24 mb-6" 
              resizeMode="contain"
            />
            <Text className="text-3xl font-bold text-white mb-2">Log In</Text>
            <Text className="text-white/80 text-center text-base">
              Hi! Welcome back, you've been missed.
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 mt-4 shadow-sm">
            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 font-bold mb-2 ml-1">Email or Mobile Number</Text>
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-gray-50 p-4 rounded-xl border ${errors.identifier ? 'border-red-500' : 'border-gray-200'} text-gray-800`}
                      placeholder="Enter email or mobile number"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  )}
                />
                {errors.identifier && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.identifier.message}</Text>}
              </View>

              <View>
                <Text className="text-gray-700 font-bold mb-2 ml-1">Password</Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="relative">
                      <TextInput
                        className={`bg-gray-50 p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} pr-12 text-gray-800`}
                        placeholder="Enter your password"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        secureTextEntry={!showPassword}
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
                {errors.password && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.password.message}</Text>}
              </View>
            </View>

            <TouchableOpacity 
              className="mt-4 items-end"
              onPress={() => router.push('/(auth)/forgot-password' as any)}
            >
              <Text className="text-[#1E3A8A] font-medium">Forgot Password?</Text>
            </TouchableOpacity>

            {globalError && (
              <View className="bg-red-50 p-3 rounded-lg mb-4 mt-2 border border-red-200">
                <Text className="text-red-600 text-center">{globalError}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className={`mt-8 bg-[#15286A] p-4 rounded-xl items-center justify-center min-h-[56px] ${isSubmitting ? 'opacity-70' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Sign In</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500">Don't have an account? </Text>
              <Link href={{ pathname: "/(auth)/sign-up", params: { role } }} asChild>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text className="text-[#EF4444] font-bold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
