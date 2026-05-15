import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSignIn } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginType } from '../../schemas/auth';
import { Eye, EyeSlash } from 'iconsax-react-native';

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const isLoaded = fetchStatus === 'idle';
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { identifier: '', password: '' }
  });

  const onSubmit = async (data: LoginType) => {
    if (!isLoaded || !signIn) return;
    setGlobalError(null);

    try {
      const { createdSessionId, error: signInError } = await signIn.create({
        identifier: data.identifier,
        password: data.password,
      });

      if (signInError) {
        setGlobalError(signInError.message);
        return;
      }

      if (createdSessionId) {
        router.replace('/');
      } else {
        setGlobalError(`Sign in status: ${signIn.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setGlobalError(message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#1E3A8A]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 p-6 justify-center mt-10">
          <View className="mb-10 items-center">
            {/* Placeholder for DisasTRACE Logo */}
            <View className="w-24 h-24 bg-white/20 rounded-2xl items-center justify-center mb-6">
              <Text className="text-white font-bold text-xl">LOGO</Text>
            </View>
            <Text className="text-3xl font-bold text-white mb-2">Log In</Text>
            <Text className="text-white/80 text-center text-base">
              Hi! Welcome back, you've been missed.
            </Text>
          </View>

          <View className="bg-white p-6 rounded-3xl space-y-4">
            <View className="mb-4">
              <Text className="text-[#1E3A8A] font-bold mb-2 ml-1">Email / Mobile</Text>
              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className={`bg-gray-50 p-4 rounded-xl border ${errors.identifier ? 'border-red-500' : 'border-gray-200'} text-gray-800 h-14`}
                    placeholder="Enter your email or mobile"
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
            
            <View className="mb-2">
              <Text className="text-[#1E3A8A] font-bold mb-2 ml-1">Password</Text>
              <View className="relative justify-center">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className={`bg-gray-50 p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} text-gray-800 h-14 pr-12`}
                      placeholder="Enter your password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      secureTextEntry={!showPassword}
                    />
                  )}
                />
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

            <View className="items-end mb-6">
              <TouchableOpacity className="py-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text className="text-[#1E3A8A] font-bold">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {globalError && (
              <View className="bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
                <Text className="text-red-600 text-center">{globalError}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className={`bg-[#1E3A8A] rounded-xl items-center justify-center min-h-[56px] mt-2 ${isSubmitting ? 'opacity-70' : ''}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Login</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500">Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text className="text-[#EF4444] font-bold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}