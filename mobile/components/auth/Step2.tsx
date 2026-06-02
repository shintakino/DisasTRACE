import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContactDetailsSchema, ContactDetailsType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';
import { ArrowDown2, SearchNormal1 } from 'iconsax-react-native';
import * as Haptics from 'expo-haptics';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const BARANGAYS = [
  "BAGONG NAYON", "BARANGAY I", "BARANGAY II", "BARANGAY III", "CALANTIPAY",
  "CATULINAN", "CONCEPCION", "HINUKAY", "MAKINABANG", "MATANGTUBIG",
  "PAGALA", "PAITAN", "PIEL", "PINAGBARILAN", "POBLACION",
  "SABANG", "SAN JOSE", "SAN ROQUE", "SANTA BARBARA", "SANTO CRISTO",
  "SANTO NIÑO", "SUBIC", "SULIVAN", "TANGOS", "TARCAN",
  "TIBAG", "TILAPAYONG"
];

export default function Step2({ onNext, onBack }: Props) {
  const { data, updateData } = useSignUpStore();
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [pendingStepData, setPendingStepData] = useState<ContactDetailsType | null>(null);

  const pinRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];
  
  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<ContactDetailsType>({
    resolver: zodResolver(ContactDetailsSchema),
    defaultValues: {
      email: data.email || '',
      mobileNumber: data.mobileNumber || '',
      province: data.province || 'BULACAN',
      city: data.city || 'BALIWAG CITY',
      barangay: data.barangay || '',
      street: data.street || '',
    }
  });

  const currentBarangay = watch('barangay');

  const filteredBarangays = BARANGAYS.filter(b => 
    b.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // SMS Resend Cooldown Countdown
  useEffect(() => {
    let interval: any;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpModal, otpTimer]);

  // Direct validation triggering on full 6-digit OTP code input
  useEffect(() => {
    const fullCode = otpCode.join('');
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  }, [otpCode]);

  const onSubmit = async (stepData: ContactDetailsType) => {
    setCheckingPhone(true);
    setPhoneError(null);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      // 1. Resolve phone number uniqueness first
      const response = await fetch(`${apiUrl}/api/auth/resolve-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: stepData.mobileNumber }),
      });

      if (response.ok) {
        setPhoneError("This mobile number is already registered. Please use another one.");
        setCheckingPhone(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      
      // 2. Trigger send-signup OTP
      const otpResponse = await fetch(`${apiUrl}/api/auth/otp/send-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: stepData.mobileNumber }),
      });

      const otpResData = await otpResponse.json();

      if (!otpResponse.ok) {
        setPhoneError(otpResData.error || "Failed to send verification SMS. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setCheckingPhone(false);
        return;
      }

      // Trigger success haptic on sending OTP code
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // If server returns the code in response (development simulation), log it
      if (otpResData.code) {
        console.log(`[Dev Simulation] Verification code sent: ${otpResData.code}`);
      }

      // Store contact details temporarily, and launch the OTP verification slide-up Modal
      setPendingStepData(stepData);
      setPhoneForOtp(stepData.mobileNumber);
      setOtpCode(['', '', '', '', '', '']);
      setOtpError(null);
      setOtpTimer(60);
      setShowOtpModal(true);

      // Focus on first PIN input cell
      setTimeout(() => {
        pinRefs[0].current?.focus();
      }, 500);

    } catch (err) {
      console.error("Error validating phone and triggering OTP:", err);
      setPhoneError("Connection error. Please check your internet connection.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setOtpError(null);
    setIsVerifyingOtp(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/otp/verify-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForOtp,
          otpCode: code,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Invalid OTP code.');
      }

      // Provide premium success tactile feedback and transition
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setShowOtpModal(false);

      if (pendingStepData) {
        updateData({
          ...pendingStepData,
          province: pendingStepData.province.toUpperCase(),
          city: pendingStepData.city.toUpperCase(),
          barangay: pendingStepData.barangay.toUpperCase(),
          street: pendingStepData.street.toUpperCase(),
        });
      }
      onNext();
    } catch (err: any) {
      setOtpError(err.message || 'OTP verification failed.');
      setOtpCode(['', '', '', '', '', '']); // Clear input boxes
      pinRefs[0].current?.focus(); // Focus back to first cell
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
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/otp/send-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForOtp,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to resend code.');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setOtpTimer(60);
      pinRefs[0].current?.focus();

      if (resData.code) {
        console.log(`[Dev Simulation] Resent verification code: ${resData.code}`);
      }
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

  const formatMobileNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Ensure it starts with 09
    if (cleaned.length <= 2) return cleaned.startsWith('0') ? cleaned : '0' + cleaned;
    if (cleaned.length > 2 && !cleaned.startsWith('09')) return '09' + cleaned.substring(cleaned.startsWith('0') ? 1 : 0);
    return cleaned.substring(0, 11);
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Email Address *</Text>
        <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-800`}
            placeholder="your@email.com" onBlur={onBlur} 
            onChangeText={(text) => onChange(text.toLowerCase())} 
            value={value}
            autoCapitalize="none" keyboardType="email-address"
          />
        )} />
        {errors.email && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.email.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Mobile Number *</Text>
        <Controller control={control} name="mobileNumber" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.mobileNumber ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-800`}
            placeholder="09123456789" onBlur={onBlur} 
            onChangeText={(text) => onChange(formatMobileNumber(text))} 
            value={value}
            keyboardType="phone-pad"
            maxLength={11}
          />
        )} />
        <Text className="text-gray-400 text-xs mt-1 ml-1">Format: 09XXXXXXXXX</Text>
        {errors.mobileNumber && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.mobileNumber.message}</Text>}
        {phoneError && <Text className="text-red-500 text-sm mt-1 ml-1 font-semibold">{phoneError}</Text>}
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-gray-700 font-bold mb-2 ml-1">Province *</Text>
          <Controller control={control} name="province" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-100 p-4 rounded-xl border ${errors.province ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-500`}
              placeholder="BULACAN" onBlur={onBlur} 
              onChangeText={(text) => onChange(text.toUpperCase())} 
              value={value}
              editable={false} // Locked to Bulacan per requirement
            />
          )} />
          {errors.province && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.province.message}</Text>}
        </View>
        <View className="flex-1">
          <Text className="text-gray-700 font-bold mb-2 ml-1">City / Municipality *</Text>
          <Controller control={control} name="city" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-100 p-4 rounded-xl border ${errors.city ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-500`}
              placeholder="BALIWAG CITY" onBlur={onBlur} 
              onChangeText={(text) => onChange(text.toUpperCase())} 
              value={value}
              editable={false} // Locked to Baliwag City per requirement
            />
          )} />
          {errors.city && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.city.message}</Text>}
        </View>
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Barangay *</Text>
        <TouchableOpacity 
          onPress={() => setShowBarangayModal(true)}
          className={`bg-gray-50 p-4 rounded-xl border ${errors.barangay ? 'border-red-500' : 'border-gray-200'} h-14 flex-row items-center justify-between`}
        >
          <Text className={currentBarangay ? 'text-gray-800 font-medium' : 'text-gray-400'}>
            {currentBarangay || "SELECT BARANGAY"}
          </Text>
          <ArrowDown2 color="#4B5563" size={20} />
        </TouchableOpacity>
        {errors.barangay && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.barangay.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Street / House No. *</Text>
        <Controller control={control} name="street" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.street ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-800`}
            placeholder="UNIT 123, GEN. ALEJO SANTOS ST." onBlur={onBlur} 
            onChangeText={(text) => onChange(text.toUpperCase())} 
            value={value}
            autoCapitalize="characters"
          />
        )} />
        {errors.street && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.street.message}</Text>}
      </View>

      <View className="flex-row gap-4 mt-6">
        <TouchableOpacity
          onPress={onBack}
          disabled={checkingPhone}
          className="flex-1 bg-white border border-gray-200 rounded-xl items-center justify-center min-h-[56px]"
        >
          <Text className="text-gray-700 font-bold text-lg">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          disabled={checkingPhone}
          className={`flex-1 bg-[#1E3A8A] rounded-xl items-center justify-center min-h-[56px] ${checkingPhone ? 'opacity-70' : ''}`}
        >
          {checkingPhone ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Next</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Barangay Selector Modal */}
      <Modal visible={showBarangayModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-[#1E3A8A]">Select Barangay</Text>
              <TouchableOpacity onPress={() => setShowBarangayModal(false)}>
                <Text className="text-gray-500 font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-gray-100 flex-row items-center px-4 rounded-xl mb-4 h-12">
              <SearchNormal1 size={18} color="#6B7280" />
              <TextInput 
                className="flex-1 ml-2 text-gray-800" 
                placeholder="Search or type barangay..."
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Allow typing if not in list */}
              {searchQuery && !BARANGAYS.includes(searchQuery) && (
                <TouchableOpacity 
                  className="py-4 border-b border-gray-100 flex-row justify-between"
                  onPress={() => {
                    setValue('barangay', searchQuery, { shouldValidate: true });
                    setShowBarangayModal(false);
                    setSearchQuery('');
                  }}
                >
                  <Text className="text-lg text-[#EF4444] font-bold">USE: "{searchQuery}"</Text>
                </TouchableOpacity>
              )}

              {filteredBarangays.map((b) => (
                <TouchableOpacity 
                  key={b}
                  className="py-4 border-b border-gray-100"
                  onPress={() => {
                    setValue('barangay', b, { shouldValidate: true });
                    setShowBarangayModal(false);
                    setSearchQuery('');
                  }}
                >
                  <Text className={`text-lg ${currentBarangay === b ? 'text-[#1E3A8A] font-bold' : 'text-gray-800'}`}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {filteredBarangays.length === 0 && !searchQuery && (
                <Text className="text-gray-400 text-center mt-10">No barangays found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Premium Frosted Glass Slide-up OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOtpModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <TouchableOpacity 
            className="flex-grow" 
            activeOpacity={1} 
            onPress={() => setShowOtpModal(false)}
          />
          <View className="bg-[#0B1536] border-t border-white/10 rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
            
            <Text className="text-2xl font-bold text-white text-center mb-2">Verify Mobile Number</Text>
            <Text className="text-white/60 text-center mb-6 px-6">
              Enter the 6-digit verification code sent to <Text className="text-white font-semibold">{phoneForOtp}</Text>
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
    </View>
  );
}