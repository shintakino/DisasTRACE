import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PersonalInfoSchema, PersonalInfoType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';

interface Props {
  onNext: () => void;
}

export default function Step1({ onNext }: Props) {
  const { data, updateData } = useSignUpStore();
  
  const { control, handleSubmit, formState: { errors } } = useForm<PersonalInfoType>({
    resolver: zodResolver(PersonalInfoSchema),
    defaultValues: {
      firstName: data.firstName || '',
      middleName: data.middleName || '',
      lastName: data.lastName || '',
      suffix: data.suffix || '',
      gender: data.gender || 'Male',
    }
  });

  const onSubmit = (stepData: PersonalInfoType) => {
    updateData(stepData);
    onNext();
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">First Name *</Text>
        <Controller control={control} name="firstName" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} h-14`}
            placeholder="Juan" onBlur={onBlur} onChangeText={onChange} value={value}
          />
        )} />
        {errors.firstName && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.firstName.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Middle Name</Text>
        <Controller control={control} name="middleName" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-14"
            placeholder="Santos" onBlur={onBlur} onChangeText={onChange} value={value}
          />
        )} />
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Surname *</Text>
        <Controller control={control} name="lastName" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} h-14`}
            placeholder="Dela Cruz" onBlur={onBlur} onChangeText={onChange} value={value}
          />
        )} />
        {errors.lastName && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.lastName.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Suffix Name</Text>
        <Controller control={control} name="suffix" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-14"
            placeholder="Jr., Sr., III" onBlur={onBlur} onChangeText={onChange} value={value}
          />
        )} />
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Gender *</Text>
        <Controller control={control} name="gender" render={({ field: { onChange, value } }) => (
          <View className="flex-row gap-4">
            {['Male', 'Female'].map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => onChange(g)}
                className={`flex-1 p-4 rounded-xl border-2 items-center justify-center min-h-[56px] ${value === g ? 'bg-[#1E3A8A]/10 border-[#1E3A8A]' : 'bg-white border-gray-200'}`}
              >
                <Text className={`font-bold ${value === g ? 'text-[#1E3A8A]' : 'text-gray-600'}`}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )} />
        {errors.gender && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.gender.message}</Text>}
      </View>

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        className="bg-[#1E3A8A] rounded-xl items-center justify-center min-h-[56px] mt-6"
      >
        <Text className="text-white font-bold text-lg">Next</Text>
      </TouchableOpacity>
    </View>
  );
}