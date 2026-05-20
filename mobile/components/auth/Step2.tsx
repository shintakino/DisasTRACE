import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContactDetailsSchema, ContactDetailsType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';
import { ArrowDown2, SearchNormal1 } from 'iconsax-react-native';

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

  const onSubmit = (stepData: ContactDetailsType) => {
    updateData({
      ...stepData,
      province: stepData.province.toUpperCase(),
      city: stepData.city.toUpperCase(),
      barangay: stepData.barangay.toUpperCase(),
      street: stepData.street.toUpperCase(),
    });
    onNext();
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
    </View>
  );
}