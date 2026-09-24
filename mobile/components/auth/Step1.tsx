import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PersonalInfoSchema, PersonalInfoType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';

interface Props {
  onNext: () => void;
  onInputFocus?: (target: number) => void;
}

const NAME_SUFFIXES = ['', 'JR.', 'SR.', 'II', 'III', 'IV', 'V'] as const;

export default function Step1({ onNext, onInputFocus }: Props) {
  const { data, updateData } = useSignUpStore();
  const [suffixPickerVisible, setSuffixPickerVisible] = useState(false);
  
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
    // Zod transform handles uppercase, but we force it here for immediate state update
    updateData({
      ...stepData,
      firstName: stepData.firstName.toUpperCase(),
      middleName: stepData.middleName?.toUpperCase(),
      lastName: stepData.lastName.toUpperCase(),
      suffix: stepData.suffix?.toUpperCase(),
    });
    onNext();
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">First Name *</Text>
        <Controller control={control} name="firstName" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.firstName ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-800`}
            placeholder="JUAN" onBlur={onBlur} 
            onChangeText={onChange} 
            value={value}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            onFocus={(event) => onInputFocus?.(event.nativeEvent.target)}
          />
        )} />
        {errors.firstName && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.firstName.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Middle Name (Optional)</Text>
        <Controller control={control} name="middleName" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-14 text-gray-800"
            placeholder="SANTOS" onBlur={onBlur} 
            onChangeText={onChange} 
            value={value}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            onFocus={(event) => onInputFocus?.(event.nativeEvent.target)}
          />
        )} />
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Surname *</Text>
        <Controller control={control} name="lastName" render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className={`bg-gray-50 p-4 rounded-xl border ${errors.lastName ? 'border-red-500' : 'border-gray-200'} h-14 text-gray-800`}
            placeholder="DELA CRUZ" onBlur={onBlur} 
            onChangeText={onChange} 
            value={value}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            onFocus={(event) => onInputFocus?.(event.nativeEvent.target)}
          />
        )} />
        {errors.lastName && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.lastName.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Suffix Name (Optional)</Text>
        <Controller control={control} name="suffix" render={({ field: { onChange, value } }) => (
          <>
            <TouchableOpacity
              onPress={() => setSuffixPickerVisible(true)}
              className="bg-gray-50 px-4 rounded-xl border border-gray-200 h-14 flex-row items-center justify-between"
              accessibilityRole="button"
              accessibilityLabel="Choose name suffix"
              accessibilityState={{ expanded: suffixPickerVisible }}
            >
              <Text className={value ? 'text-gray-800 font-medium' : 'text-gray-400'}>{value || 'NO SUFFIX'}</Text>
              <Text className="text-[#1E3A8A] font-bold text-lg">⌄</Text>
            </TouchableOpacity>
            <Modal visible={suffixPickerVisible} transparent animationType="fade" onRequestClose={() => setSuffixPickerVisible(false)}>
              <View className="flex-1 bg-black/40 justify-end">
                <View className="bg-white rounded-t-3xl px-6 pt-5 pb-8">
                  <Text className="text-lg font-bold text-slate-800 mb-1">Name Suffix</Text>
                  <Text className="text-sm text-slate-500 mb-4">Choose the official suffix, if applicable.</Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {NAME_SUFFIXES.map((suffixOption) => (
                      <TouchableOpacity
                        key={suffixOption || 'none'}
                        onPress={() => { onChange(suffixOption); setSuffixPickerVisible(false); }}
                        className={`min-h-[48px] px-4 rounded-xl justify-center mb-2 ${value === suffixOption ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: value === suffixOption }}
                      >
                        <Text className={`font-bold ${value === suffixOption ? 'text-[#1E3A8A]' : 'text-slate-700'}`}>{suffixOption || 'No suffix'}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </>
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
