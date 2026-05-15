import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContactDetailsSchema, ContactDetailsType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function Step2({ onNext, onBack }: Props) {
  const { data, updateData } = useSignUpStore();
  
  const { control, handleSubmit, formState: { errors } } = useForm<ContactDetailsType>({
    resolver: zodResolver(ContactDetailsSchema),
    defaultValues: {
      email: data.email || '',
      mobileNumber: data.mobileNumber || '',
      province: data.province || '',
      city: data.city || '',
      barangay: data.barangay || '',
      street: data.street || '',
    }
  });

  const onSubmit = (stepData: ContactDetailsType) => {
    updateData(stepData);
    onNext();
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Email Address *</Text>
        <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.email ? 'border-red-500' : 'border-gray-200'} h-14`}
            placeholder="your@email.com" onBlur={onBlur} onChangeText={onChange} value={value}
            autoCapitalize="none" keyboardType="email-address"
          />
        )} />
        {errors.email && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.email.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Mobile Number *</Text>
        <Controller control={control} name="mobileNumber" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.mobileNumber ? 'border-red-500' : 'border-gray-200'} h-14`}
            placeholder="09123456789" onBlur={onBlur} onChangeText={onChange} value={value}
            keyboardType="phone-pad"
          />
        )} />
        {errors.mobileNumber && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.mobileNumber.message}</Text>}
      </View>

      <View className="flex-row gap-4">
        <View className="flex-1">
          <Text className="text-gray-700 font-bold mb-2 ml-1">Province *</Text>
          <Controller control={control} name="province" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-50 p-4 rounded-xl border ${errors.province ? 'border-red-500' : 'border-gray-200'} h-14`}
              placeholder="Bulacan" onBlur={onBlur} onChangeText={onChange} value={value}
            />
          )} />
          {errors.province && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.province.message}</Text>}
        </View>
        <View className="flex-1">
          <Text className="text-gray-700 font-bold mb-2 ml-1">City / Municipality *</Text>
          <Controller control={control} name="city" render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={`bg-gray-50 p-4 rounded-xl border ${errors.city ? 'border-red-500' : 'border-gray-200'} h-14`}
              placeholder="Baliwag" onBlur={onBlur} onChangeText={onChange} value={value}
            />
          )} />
          {errors.city && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.city.message}</Text>}
        </View>
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Barangay *</Text>
        <Controller control={control} name="barangay" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.barangay ? 'border-red-500' : 'border-gray-200'} h-14`}
            placeholder="Poblacion" onBlur={onBlur} onChangeText={onChange} value={value}
          />
        )} />
        {errors.barangay && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.barangay.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Street / House No. *</Text>
        <Controller control={control} name="street" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.street ? 'border-red-500' : 'border-gray-200'} h-14`}
            placeholder="123 Main St." onBlur={onBlur} onChangeText={onChange} value={value}
          />
        )} />
        {errors.street && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.street.message}</Text>}
      </View>

      <View className="flex-row gap-4 mt-6">
        <TouchableOpacity
          onPress={onBack}
          className="flex-1 bg-white border border-gray-200 rounded-xl items-center justify-center min-h-[56px]"
        >
          <Text className="text-gray-700 font-bold text-lg">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          className="flex-1 bg-[#1E3A8A] rounded-xl items-center justify-center min-h-[56px]"
        >
          <Text className="text-white font-bold text-lg">Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}