import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordSchema, PasswordType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';
import { Eye, EyeSlash, TickSquare } from 'iconsax-react-native';

interface Props {
  onRegister: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function Step4({ onRegister, onBack, isLoading }: Props) {
  const { updateData } = useSignUpStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { control, handleSubmit, formState: { errors } } = useForm<PasswordType>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      termsAccepted: false as any, // initial false
    }
  });

  const onSubmit = (stepData: PasswordType) => {
    updateData({ password: stepData.password, confirmPassword: stepData.confirmPassword, termsAccepted: stepData.termsAccepted });
    onRegister();
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Create Password *</Text>
        <View className="relative justify-center">
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-50 p-4 rounded-xl border ${errors.password ? 'border-red-500' : 'border-gray-200'} h-14 pr-12`}
              placeholder="At least 8 characters" onBlur={onBlur} onChangeText={onChange} value={value}
              secureTextEntry={!showPassword}
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
              className={`bg-gray-50 p-4 rounded-xl border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} h-14 pr-12`}
              placeholder="Re-enter password" onBlur={onBlur} onChangeText={onChange} value={value}
              secureTextEntry={!showConfirmPassword}
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
              I agree to the <Text className="text-[#1E3A8A] font-bold">Terms and Conditions</Text> & <Text className="text-[#1E3A8A] font-bold">Privacy Policy</Text>
            </Text>
          </TouchableOpacity>
        )} />
        {errors.termsAccepted && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.termsAccepted.message}</Text>}
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
          disabled={isLoading}
          className={`flex-1 bg-[#1E3A8A] rounded-xl items-center justify-center min-h-[56px] ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Register</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}