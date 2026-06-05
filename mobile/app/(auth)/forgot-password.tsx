import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sms, TickCircle } from 'iconsax-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OTP State
  const [showOtpSheet, setShowOtpSheet] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [sentPhone, setSentPhone] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const pinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // SMS Resend Cooldown Countdown
  useEffect(() => {
    let interval: any;
    if (showOtpSheet && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpSheet, otpTimer]);

  // Direct validation triggering on full 6-digit OTP code input
  useEffect(() => {
    const fullCode = otpCode.join('');
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  }, [otpCode]);

  const handleIdentifierSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    const input = identifier.trim();

    if (!input) {
      setError('Please enter your email or mobile number.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    // Check if input is phone format
    const isPhone = /^(09|\+63|63)?\d{9,10}$/.test(input);

    if (isPhone) {
      // Phone Flow
      setIsLoading(true);
      let phone = input;
      if (phone.startsWith('+63')) {
        phone = '0' + phone.slice(3);
      } else if (phone.startsWith('63')) {
        phone = '0' + phone.slice(2);
      } else if (phone.length === 10 && phone.startsWith('9')) {
        phone = '0' + phone;
      }

      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send',
            phone,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send verification code.');
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSentPhone(phone);
        setOtpCode(['', '', '', '', '', '']);
        setOtpTimer(60);
        setOtpError(null);
        setShowOtpSheet(true);
        
        // Auto-focus first input cell after sheet slides up
        setTimeout(() => {
          pinRefs[0].current?.focus();
        }, 300);

      } catch (err: any) {
        setError(err.message || 'An error occurred. Please try again.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } finally {
        setIsLoading(false);
      }
    } else {
      // Email Flow
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      if (!isEmail) {
        setError('Please enter a valid email address or mobile number.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }

      setIsLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(input, {
          redirectTo: 'disastrace://(auth)/reset-password',
        });

        if (resetError) {
          throw resetError;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSuccessMessage('Password reset link sent to your email. Check your inbox!');
      } catch (err: any) {
        setError(err.message || 'Failed to send password recovery email.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setOtpError(null);
    setIsVerifyingOtp(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify',
          phone: sentPhone,
          otpCode: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP code.');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowOtpSheet(false);
      
      // Navigate to reset password with phone and verification token
      router.push({
        pathname: '/(auth)/reset-password' as any,
        params: { phone: sentPhone, token: data.token }
      });

    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed.');
      setOtpCode(['', '', '', '', '', '']); // Clear on failure
      pinRefs[0].current?.focus(); // Re-focus first cell
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setOtpError(null);
    setOtpCode(['', '', '', '', '', '']);
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send',
          phone: sentPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setOtpTimer(60);
      pinRefs[0].current?.focus();
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const cleanText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otpCode];
    newOtp[index] = cleanText.slice(-1);
    setOtpCode(newOtp);

    if (cleanText && index < 5) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (!otpCode[index] && index > 0) {
        const newOtp = [...otpCode];
        newOtp[index - 1] = '';
        setOtpCode(newOtp);
        pinRefs[index - 1].current?.focus();
      }
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
              <Image
                source={require('../../assets/images/DisasTRACELogo.png')}
                className="w-24 h-24 mb-6"
                resizeMode="contain"
              />
              <Text className="text-3xl font-bold text-white mb-2">Forgot Password?</Text>
              <Text className="text-white/80 text-center text-base px-4">
                No worries! Enter your Email or Mobile number below to reset your password.
              </Text>
            </View>

            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <View className="space-y-4 mb-4">
                <View>
                  <Text className="text-gray-700 font-bold mb-2 ml-1">Email or Mobile Number</Text>
                  <View className="relative">
                    <TextInput
                      className={`bg-gray-50 p-4 rounded-xl border ${error ? 'border-red-500' : 'border-gray-200'} text-gray-800 pr-12`}
                      placeholder="e.g. name@email.com or 09XXXXXXXXX"
                      value={identifier}
                      onChangeText={(val) => {
                        setIdentifier(val);
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!isLoading}
                    />
                    <View className="absolute right-4 top-4">
                      <Sms size={20} color="#9CA3AF" />
                    </View>
                  </View>
                </View>
              </View>

              {error && (
                <View className="bg-red-50 p-3 rounded-lg mb-4 border border-red-200">
                  <Text className="text-red-600 text-center text-sm font-medium">{error}</Text>
                </View>
              )}

              {successMessage && (
                <View className="bg-green-50 p-4 rounded-xl mb-4 border border-green-200 items-center flex-row">
                  <TickCircle size={20} color="#10B981" />
                  <Text className="text-green-700 font-semibold text-sm flex-1 ml-2">{successMessage}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleIdentifierSubmit}
                disabled={isLoading}
                className={`mt-4 bg-[#15286A] p-4 rounded-xl items-center justify-center min-h-[56px] ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Send Instructions</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Dynamic 6-digit OTP verification entry sheet/modal */}
      <Modal
        visible={showOtpSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtpSheet(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <TouchableOpacity 
            className="flex-grow" 
            activeOpacity={1} 
            onPress={() => setShowOtpSheet(false)}
          />
          <View className="bg-[#0E1B46] border-t border-white/10 rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            
            <Text className="text-2xl font-bold text-white text-center mb-2">Verify Mobile Number</Text>
            <Text className="text-white/60 text-center mb-6 px-6">
              Enter the 6-digit verification code sent to <Text className="text-white font-semibold">{sentPhone}</Text>
            </Text>

            {/* OTP Grid of 6 focusable digital cells */}
            <View className="flex-row justify-between mb-6 px-2">
              {otpCode.map((val, index) => (
                <TextInput
                  key={index}
                  ref={pinRefs[index]}
                  className={`w-[14%] aspect-square bg-[#15286A] rounded-xl border text-center text-white text-2xl font-bold ${
                    val ? 'border-[#10B981]' : 'border-white/10'
                  }`}
                  keyboardType="numeric"
                  maxLength={1}
                  value={val}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  selectTextOnFocus
                />
              ))}
            </View>

            {otpError && (
              <View className="bg-red-500/10 p-3 rounded-lg mb-6 border border-red-500/20">
                <Text className="text-red-400 text-center text-sm font-medium">{otpError}</Text>
              </View>
            )}

            {isVerifyingOtp && (
              <View className="flex-row justify-center items-center mb-6">
                <ActivityIndicator color="#10B981" />
                <Text className="text-white/80 font-medium ml-2">Verifying code...</Text>
              </View>
            )}

            {/* automated 60-second cooldown timer for SMS OTP resending */}
            <View className="items-center mt-2">
              {otpTimer > 0 ? (
                <Text className="text-white/45 font-medium">
                  Resend code in <Text className="text-[#10B981] font-semibold">{otpTimer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text className="text-[#10B981] font-bold text-base underline">
                    Resend Verification Code
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
