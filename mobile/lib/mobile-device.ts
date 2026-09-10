import * as Application from 'expo-application';
import { Platform } from 'react-native';

/** Returns the Android app-scoped device identifier without persisting it. */
export function getMobileDeviceId(): string {
  const id = Platform.OS === 'android' ? Application.getAndroidId() : null;
  if (!id) throw new Error('This device could not be identified. Please update the app and try again.');
  return id;
}
