import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContactDetailsSchema, ContactDetailsType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';
import { ArrowDown2, SearchNormal1 } from 'iconsax-react-native';
import * as Haptics from 'expo-haptics';
import { fetchWithTimeout } from '../../lib/network-timeout';
import { OtpVerificationModal } from './OtpVerificationModal';
import { updateOtpDigits } from '../../lib/otp-input';
import { getMobileApiBaseUrl } from '../../lib/api-base-url';

interface Props {
  onNext: () => void;
  onBack: () => void;
  onInputFocus?: (target: number) => void;
}

const BARANGAYS = [
  "BAGONG NAYON", "BARANGAY I", "BARANGAY II", "BARANGAY III", "CALANTIPAY",
  "CATULINAN", "CONCEPCION", "HINUKAY", "MAKINABANG", "MATANGTUBIG",
  "PAGALA", "PAITAN", "PIEL", "PINAGBARILAN", "POBLACION",
  "SABANG", "SAN JOSE", "SAN ROQUE", "SANTA BARBARA", "SANTO CRISTO",
  "SANTO NIÑO", "SUBIC", "SULIVAN", "TANGOS", "TARCAN",
  "TIBAG", "TILAPAYONG"
];

export default function Step2({ onNext, onBack, onInputFocus }: Props) {
  const { data, updateData } = useSignUpStore();
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const otpAttempt = useRef(0);
  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);
  const [otpCode, setOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
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

  const firstPinRef = pinRefs[0];
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

  const onSubmit = async (stepData: ContactDetailsType) => {
    setCheckingPhone(true);
    setPhoneError(null);
    try {
      const apiUrl = getMobileApiBaseUrl();

      // 1. Resolve phone number uniqueness first
      const response = await fetchWithTimeout(`${apiUrl}/api/auth/resolve-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: stepData.mobileNumber }),
      }, 10_000, 'phone number check');

      if (response.ok) {
        setPhoneError("This mobile number is already registered. Please use another one.");
        setCheckingPhone(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return;
      }
      
      // 2. Trigger send-signup OTP
      const otpResponse = await fetchWithTimeout(`${apiUrl}/api/auth/otp/send-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: stepData.mobileNumber }),
      }, 15_000, 'verification SMS');

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
      otpAttempt.current++;
      setShowOtpModal(true);


    } catch (err) {
      console.error("Error validating phone and triggering OTP:", err);
      setPhoneError("Connection error. Please check your internet connection.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (verifyingRef.current || resendingRef.current || !showOtpModal) return;
    verifyingRef.current = true;
    const attempt = otpAttempt.current;
    setOtpError(null);
    setIsVerifyingOtp(true);

    try {
      const apiUrl = getMobileApiBaseUrl();
      const response = await fetchWithTimeout(`${apiUrl}/api/auth/otp/verify-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForOtp,
          otpCode: code,
        }),
      }, 12_000, 'OTP verification');

      const resData = await response.json();
      if (attempt !== otpAttempt.current) return;

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
      if (attempt !== otpAttempt.current) return;
      setOtpError(err.message || 'OTP verification failed.');
      setOtpCode(['', '', '', '', '', '']); // Clear input boxes
      firstPinRef.current?.focus(); // Focus back to first cell
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      verifyingRef.current = false;
      setIsVerifyingOtp(false);
    }
  }, [showOtpModal, phoneForOtp, pendingStepData, updateData, onNext, firstPinRef]);

  useEffect(() => {
    const code = otpCode.join('');
    if (code.length === 6 && !isResendingOtp) void handleVerifyOtp(code);
  }, [otpCode, handleVerifyOtp, isVerifyingOtp, isResendingOtp]);

  const handleResendOtp = async () => {
    if (otpTimer > 0 || resendingRef.current || verifyingRef.current) return;
    resendingRef.current = true;
    setIsResendingOtp(true);
    const attempt = otpAttempt.current;
    setOtpError(null);
    setOtpCode(['', '', '', '', '', '']);

    try {
      const apiUrl = getMobileApiBaseUrl();
      const response = await fetchWithTimeout(`${apiUrl}/api/auth/otp/send-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneForOtp,
        }),
      }, 15_000, 'verification SMS resend');

      const resData = await response.json();
      if (attempt !== otpAttempt.current) return;

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
      if (attempt !== otpAttempt.current) return;
      setOtpError(err.message || 'Failed to resend code.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally { resendingRef.current = false; setIsResendingOtp(false); }
  };

  const handleOtpChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    setOtpCode(previous => updateOtpDigits(previous, index, text));
    if (digits && digits.length < 6) pinRefs[Math.min(5, index + digits.length)].current?.focus();
  };

  const handleOtpBackspace = (index: number) => {
    if (!otpCode[index] && index > 0) {
      setOtpCode(previous => previous.map((digit, position) => position === index - 1 ? '' : digit));
      pinRefs[index - 1].current?.focus();
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
            onChangeText={onChange} 
            value={value}
            autoCapitalize="none" keyboardType="email-address"
            autoCorrect={false}
            autoComplete="off"
            onFocus={(event) => onInputFocus?.(event.nativeEvent.target)}
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
            autoCorrect={false}
            autoComplete="off"
            onFocus={(event) => onInputFocus?.(event.nativeEvent.target)}
          />
        )} />
        <Text className="text-gray-400 text-xs mt-1 ml-1">Format: 09XXXXXXXXX</Text>
        {errors.mobileNumber && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.mobileNumber.message}</Text>}
        {phoneError && <Text className="text-red-500 text-sm mt-1 ml-1 font-semibold">{phoneError}</Text>}
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-gray-700 font-bold mb-2 ml-1">Province</Text>
          <Controller control={control} name="province" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-100 p-4 rounded-xl border ${errors.province ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-500`}
              placeholder="BULACAN" onBlur={onBlur} 
              onChangeText={onChange} 
              value={value}
              editable={false} // Locked to Bulacan per requirement
            />
          )} />
          {errors.province && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.province.message}</Text>}
        </View>
        <View className="flex-1">
          <Text className="text-gray-700 font-bold mb-2 ml-1">City / Municipality</Text>
          <Controller control={control} name="city" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-100 p-4 rounded-xl border ${errors.city ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-500`}
              placeholder="BALIWAG CITY" onBlur={onBlur} 
              onChangeText={onChange} 
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
            onChangeText={onChange} 
            value={value}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            onFocus={(event) => onInputFocus?.(event.nativeEvent.target)}
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
                  <Text className="text-lg text-[#EF4444] font-bold">{`USE: "${searchQuery}"`}</Text>
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

      <OtpVerificationModal
        visible={showOtpModal} phone={phoneForOtp} digits={otpCode} inputRefs={pinRefs}
        error={otpError} verifying={isVerifyingOtp} resending={isResendingOtp} timer={otpTimer}
        onClose={() => { otpAttempt.current++; setShowOtpModal(false); }}
        onChange={handleOtpChange} onBackspace={handleOtpBackspace} onResend={handleResendOtp}
      />
    </View>
  );
}
