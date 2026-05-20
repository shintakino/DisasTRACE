import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { VerificationSchema, VerificationType } from '../../schemas/auth';
import { useSignUpStore } from '../../store/useSignUpStore';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera, DocumentUpload, ArrowDown2 } from 'iconsax-react-native';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const ID_TYPES = ["National ID", "Passport", "Driver's License", "UMID", "Postal ID", "Other Valid ID"];

export default function Step3({ onNext, onBack }: Props) {
  const { data, updateData } = useSignUpStore();
  const { role } = useLocalSearchParams<{ role: string }>();
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  
  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<VerificationType>({
    resolver: zodResolver(VerificationSchema),
    defaultValues: {
      idCardUri: data.idCardUri || '',
      idCardType: data.idCardType || '',
      role: (role as 'public_user' | 'ambulance_responder') || data.role || 'public_user',
    }
  });

  const idCardUri = watch('idCardUri');
  const idCardType = watch('idCardType');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6, // Significant compression for 5-8MB images
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      // If image is still too large, we could use expo-image-manipulator here
      // but 'quality: 0.6' in ImagePicker is usually enough to drop 8MB to < 1MB
      setValue('idCardUri', asset.uri, { shouldValidate: true });
    }
  };

  const onSubmit = (stepData: VerificationType) => {
    updateData(stepData);
    onNext();
  };

  return (
    <View className="space-y-4">
      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">Upload ID Card *</Text>
        <TouchableOpacity 
          onPress={pickImage}
          className={`h-40 bg-gray-50 rounded-xl border-2 border-dashed ${errors.idCardUri ? 'border-red-500' : 'border-gray-300'} items-center justify-center overflow-hidden`}
        >
          {idCardUri ? (
            <Image 
              source={{ uri: idCardUri }} 
              style={{ width: '100%', height: '100%' }} 
              contentFit="cover" 
            />
          ) : (
            <View className="items-center">
              <Camera color="#9CA3AF" size={32} />
              <Text className="text-gray-500 mt-2 font-medium">Tap to upload ID</Text>
              <Text className="text-gray-400 text-xs mt-1">JPEG/PNG, max 25MB</Text>
            </View>
          )}
        </TouchableOpacity>
        {errors.idCardUri && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.idCardUri.message}</Text>}
      </View>

      <View>
        <Text className="text-gray-700 font-bold mb-2 ml-1">ID Card Type *</Text>
        <TouchableOpacity 
          onPress={() => setShowIdTypeModal(true)}
          className={`bg-gray-50 p-4 rounded-xl border ${errors.idCardType ? 'border-red-500' : 'border-gray-200'} h-14 flex-row items-center justify-between`}
        >
          <Text className={idCardType ? 'text-gray-800' : 'text-gray-400'}>
            {idCardType || "Select ID Type"}
          </Text>
          <ArrowDown2 color="#4B5563" size={20} />
        </TouchableOpacity>
        {errors.idCardType && <Text className="text-red-500 text-sm mt-1 ml-1">{errors.idCardType.message}</Text>}
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

      <Modal visible={showIdTypeModal} transparent animationType="fade">
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1} 
          onPress={() => setShowIdTypeModal(false)}
        >
          <View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[60%]">
            <Text className="text-xl font-bold text-[#1E3A8A] mb-4">Select ID Type</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ID_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type}
                  className="py-4 border-b border-gray-100"
                  onPress={() => {
                    setValue('idCardType', type, { shouldValidate: true });
                    setShowIdTypeModal(false);
                  }}
                >
                  <Text className={`text-lg ${idCardType === type ? 'text-[#1E3A8A] font-bold' : 'text-gray-800'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}