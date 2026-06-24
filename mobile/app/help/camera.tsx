import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { ChevronLeft, Zap, ZapOff, RefreshCw, Sun, Camera as CameraIcon } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<FlashMode>('off');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  useFocusEffect(
    React.useCallback(() => {
      ScreenOrientation.unlockAsync();
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );
  
  const setPhotoUri = useEmergencyReportStore(state => state.setPhotoUri);

  if (!permission) {
    return <View style={styles.container} />;
  }

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const toggleFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const currentOrientation = await ScreenOrientation.getOrientationAsync();
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false,
          exif: true,
        });
        
        if (photo) {
          let actions: ImageManipulator.Action[] = [];
          
          const isPhotoPortrait = photo.width < photo.height;
          const isDevicePortrait = 
            currentOrientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
            currentOrientation === ScreenOrientation.Orientation.PORTRAIT_DOWN;
            
          const exifOrientation = photo.exif?.Orientation ?? photo.exif?.orientation;
          const isMatch = isDevicePortrait === isPhotoPortrait;
          
          let rotation = 0;
          
          if (exifOrientation === 3 || exifOrientation === '3') {
            // Upside down rotation (180 degrees) is always safe because it preserves aspect ratio
            rotation = 180;
          } else if (exifOrientation === 6 || exifOrientation === '6') {
            // 90 degrees CW rotation. Only apply if the physical photo aspect ratio does not match
            // the device orientation, to prevent double-rotating photos that are already portrait.
            if (!isMatch) {
              rotation = 90;
            } else {
              // Pixels are already rotated, but EXIF orientation is stale (6).
              // We apply a dummy rotate (0 degrees) to force ImageManipulator to write a clean EXIF header with Orientation: 1.
              actions = [{ rotate: 0 }];
            }
          } else if (exifOrientation === 8 || exifOrientation === '8') {
            // 270 degrees CW (90 CCW) rotation. Only apply if aspect ratios mismatch.
            if (!isMatch) {
              rotation = 270;
            } else {
              actions = [{ rotate: 0 }];
            }
          }
          
          if (rotation !== 0) {
            actions = [{ rotate: rotation }];
          } else if (!exifOrientation) {
            // Fallback if EXIF orientation is missing: use screen orientation vs photo dimensions
            if (isDevicePortrait && !isPhotoPortrait) {
              actions = [{ rotate: 90 }];
            } else if (!isDevicePortrait && isPhotoPortrait) {
              actions = [{ rotate: 90 }];
            }
            
            // Handle upside down device positions if EXIF is missing
            if (currentOrientation === ScreenOrientation.Orientation.PORTRAIT_DOWN) {
              actions.push({ rotate: 180 });
            } else if (currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
              actions.push({ rotate: 180 });
            }
          }

          // Always run ImageManipulator to compress the image and normalize EXIF orientation to 1.
          // This prevents double-rotation bugs where React Native <Image> or web dashboards read
          // stale EXIF tags from the camera sensor even though the pixels were already rotated.
          const manipResult = await ImageManipulator.manipulateAsync(
            photo.uri,
            actions,
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          
          setPhotoUri(manipResult.uri);
          router.push('/help/preview');
        }
      } catch (e) {
        console.error('Failed to take picture:', e);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={!permission.granted}
        transparent
        animationType="slide"
        onRequestClose={() => router.back()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.permissionDrawer}>
            <View style={styles.iconContainer}>
              <CameraIcon size={32} color="#1E3A8A" />
            </View>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionSubtitle}>
              DisasTRACE needs camera access to let you capture live photos of the incident, speeding up PACC verification and ambulance routing.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {permission.granted && (
        <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
          
          {/* Top Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <ChevronLeft size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Center Viewfinder */}
          <View style={styles.centerArea}>
            <View style={styles.viewfinderWrapper}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.sunIcon}>
              <Sun size={20} color="#FFF" />
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.smallActionBtn} onPress={toggleFlash} activeOpacity={0.7}>
              {flash === 'on' ? (
                <Zap size={20} color="#FFF" fill="#FFF" />
              ) : (
                <ZapOff size={20} color="#FFF" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.captureOuterRing} onPress={takePicture} disabled={isCapturing} activeOpacity={0.7}>
              <View style={[styles.captureInnerCircle, isCapturing && styles.capturingState]} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.smallActionBtn} onPress={toggleFacing} activeOpacity={0.7}>
              <RefreshCw size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewfinderWrapper: {
    width: 200,
    height: 120,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  sunIcon: {
    position: 'absolute',
    right: -40,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
    gap: 40,
  },
  captureOuterRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#991B1B', // Dark red outer ring
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInnerCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFF', // White inner
  },
  capturingState: {
    backgroundColor: '#E5E7EB',
    transform: [{ scale: 0.9 }],
  },
  smallActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#991B1B', // Dark red background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  permissionDrawer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#1E3A8A',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  }
});
