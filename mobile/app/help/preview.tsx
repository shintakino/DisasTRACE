import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { X, Send } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

export default function PreviewScreen() {
  const router = useRouter();
  const photoUri = useEmergencyReportStore((state) => state.report.photoUri);
  const [isUploading, setIsUploading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // Lock preview to portrait — landscape photos will display as a landscape
      // rectangle inside the portrait frame via resizeMode="contain"
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, [])
  );

  const handleRetake = () => {
    // Clear just the photo URI and go back to camera
    useEmergencyReportStore.setState((state) => ({
      report: { ...state.report, photoUri: undefined }
    }));
    router.back();
  };

  const handleUsePhoto = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      router.push('/help/form');
    }, 1500);
  };

  if (isUploading) {
    return (
      <View style={styles.uploadingContainer}>
        <ActivityIndicator size="large" color="#FFF" style={styles.spinner} />
        <Text style={styles.uploadingText}>Uploading Photo...</Text>
      </View>
    );
  }

  if (!photoUri) {
    // Failsafe in case state drops
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>No photo captured.</Text>
        <TouchableOpacity style={styles.retakeButton} onPress={() => router.back()}>
          <Text style={styles.retakeButtonText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.fullImage} resizeMode="contain" />
      
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleRetake} activeOpacity={0.7}>
          <X size={24} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sendBtn} onPress={handleUsePhoto} activeOpacity={0.7}>
          <Send size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  cancelBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#991B1B', // Dark red
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sendBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#991B1B', // Dark red
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  retakeButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  retakeButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  uploadingContainer: {
    flex: 1,
    backgroundColor: '#1E3A8A', // Solid blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 20,
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  }
});
