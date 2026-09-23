import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown } from 'lucide-react-native';
import { uploadGovernmentID } from '../../lib/storage';

const ID_TYPES = ['National ID', 'Passport', "Driver's License", 'UMID', 'Postal ID', 'Other Valid ID'];

export function IdentityDocumentUploader({ onComplete, onCancel }: { onComplete: () => void; onCancel?: () => void }) {
  const [selectedIdType, setSelectedIdType] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showIdTypeModal, setShowIdTypeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectImage = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'gallery'} access to submit your government ID.`);
      return;
    }
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6, allowsMultipleSelection: false });
      if (!result.canceled && result.assets?.[0]?.uri) setSelectedImageUri(result.assets[0].uri);
    } catch {
      Alert.alert('Unable to select ID', 'Please try again.');
    }
  };

  const chooseImage = () => Alert.alert('Upload ID Card', 'Choose a source for your government-issued ID.', [
    { text: 'Take Photo', onPress: () => void selectImage('camera') },
    { text: 'Choose from Gallery', onPress: () => void selectImage('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const submit = async () => {
    if (!selectedIdType || !selectedImageUri) {
      Alert.alert('Missing information', 'Select your ID type and a clear photo of the ID.');
      return;
    }
    setLoading(true);
    try {
      await uploadGovernmentID(selectedImageUri, selectedIdType);
      Alert.alert('ID submitted', 'Your identity document was sent to CDRRMO Super Admin for review.');
      onComplete();
    } catch (error) {
      Alert.alert('Unable to submit ID', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return <ScrollView className="flex-1 bg-background p-6" contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
    <Text className="text-3xl font-bold text-primary text-center">Complete ID Verification</Text>
    <Text className="text-dark-grey text-center mt-3 mb-8">Upload a clear government-issued ID so CDRRMO Super Admin can review your registration.</Text>
    <Text className="text-gray-700 font-bold mb-2 ml-1">Upload ID Card *</Text>
    <TouchableOpacity onPress={chooseImage} className="h-40 bg-white rounded-xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden">
      {selectedImageUri ? <Image source={{ uri: selectedImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <View className="items-center"><Camera color="#9CA3AF" size={32} /><Text className="text-gray-500 mt-2 font-medium">Tap to upload ID</Text><Text className="text-gray-400 text-xs mt-1">JPEG/PNG/WebP, max 5MB</Text></View>}
    </TouchableOpacity>
    <Text className="text-gray-700 font-bold mt-6 mb-2 ml-1">ID Card Type *</Text>
    <TouchableOpacity onPress={() => setShowIdTypeModal(true)} className="bg-white p-4 rounded-xl border border-gray-200 h-14 flex-row items-center justify-between">
      <Text className={selectedIdType ? 'text-gray-800' : 'text-gray-400'}>{selectedIdType || 'Select ID Type'}</Text><ChevronDown color="#4B5563" size={20} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => void submit()} disabled={loading} className={`bg-primary mt-8 p-4 w-full rounded-button items-center justify-center min-h-[56px] ${loading ? 'opacity-70' : ''}`}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white font-bold text-lg">Submit Verification</Text>}
    </TouchableOpacity>
    {onCancel ? <TouchableOpacity onPress={onCancel} disabled={loading} className="mt-4 p-4 w-full border border-gray-300 rounded-button items-center justify-center min-h-[56px]"><Text className="text-dark-grey font-bold text-lg">Cancel</Text></TouchableOpacity> : null}
    <Modal visible={showIdTypeModal} transparent animationType="fade"><TouchableOpacity className="flex-1 bg-black/50 justify-end" activeOpacity={1} onPress={() => setShowIdTypeModal(false)}><View className="bg-white rounded-t-3xl p-6 pb-10 max-h-[60%]"><Text className="text-xl font-bold text-primary mb-4">Select ID Type</Text><ScrollView showsVerticalScrollIndicator={false}>{ID_TYPES.map((type) => <TouchableOpacity key={type} className="py-4 border-b border-gray-100" onPress={() => { setSelectedIdType(type); setShowIdTypeModal(false); }}><Text className={`text-lg ${selectedIdType === type ? 'text-primary font-bold' : 'text-gray-800'}`}>{type}</Text></TouchableOpacity>)}</ScrollView></View></TouchableOpacity></Modal>
  </ScrollView>;
}
