import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';

export function useLocationPermission() {
  const [isLocationGateActive, setIsLocationGateActive] = useState(false);
  const [status, setStatus] = useState<Location.PermissionStatus | null>(null);
  const [servicesEnabled, setServicesEnabled] = useState(true);

  const checkPermissions = useCallback(async () => {
    try {
      // 1. Check if location services are enabled globally on the device
      const enabled = await Location.hasServicesEnabledAsync();
      setServicesEnabled(enabled);
      
      if (!enabled) {
        setIsLocationGateActive(true);
        return;
      }

      // 2. Check foreground permission status
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      setStatus(foregroundStatus);

      if (foregroundStatus !== 'granted') {
        setIsLocationGateActive(true);
        return;
      }

      // 3. Check background permission status (required for "Always" as per spec)
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        setIsLocationGateActive(true);
        return;
      }

      setIsLocationGateActive(false);
    } catch (error) {
      console.error('Error checking location permissions:', error);
      setIsLocationGateActive(true);
    }
  }, []);

  useEffect(() => {
    checkPermissions();

    // Re-evaluate when the app returns from background/settings
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermissions]);

  return {
    isLocationGateActive,
    status,
    servicesEnabled,
    checkPermissions,
  };
}
