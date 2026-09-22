import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home2, FolderOpen, Map, User, CalendarAdd } from 'iconsax-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useResponderStore } from '../../stores/useResponderStore';
import { useResponderDutyStore } from '../../stores/useResponderDutyStore';
import { useBroadcastTracker } from '../../hooks/use-broadcast-tracker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocationPermission } from '../../hooks/use-location-permission';
import { LocationPermissionDrawer } from '../../components/dashboard/LocationPermissionDrawer';

function ResponderAvailabilityTracker() {
  const { role } = useAuthStatus();
  const dutyStatus = useResponderDutyStore((state) => state.dutyStatus);
  const responderStatus = useResponderStore((state) => state.status);
  const activeDispatch = useResponderStore((state) => state.activeDispatch);
  const targetHospital = useResponderStore((state) => state.targetHospital);
  const shouldTrack = role === 'ambulance_responder' && (
    dutyStatus === 'ON_DUTY'
    || dutyStatus === 'ACTIVE_DISPATCH'
    || responderStatus === 'en_route'
    || responderStatus === 'on_scene'
    || responderStatus === 'to_hospital'
  );

  useBroadcastTracker(
    activeDispatch?.id || null,
    shouldTrack,
    responderStatus,
    targetHospital,
    activeDispatch,
  );
  return null;
}

export default function TabLayout() {
  const router = useRouter();
  const { role } = useAuthStatus();
  const responderStatus = useResponderStore((state) => state.status);
  const insets = useSafeAreaInsets();
  const { isLocationGateActive, requestPermissions, servicesEnabled } = useLocationPermission();

  const isResponder = role === 'ambulance_responder';

  useEffect(() => {
    if (isResponder && (responderStatus === 'dispatch_offered' || responderStatus === 'en_route')) {
      console.log(`[TabLayout] Responder status updated to: ${responderStatus}. Redirecting to home tab to show incident sheet.`);
      router.replace('/(tabs)');
    }
  }, [responderStatus, isResponder, router]);

  return (
    <>
      <ResponderAvailabilityTracker />
      <Tabs screenOptions={{
      tabBarActiveTintColor: '#FFFFFF',
      tabBarInactiveTintColor: '#94A3B8',
      tabBarStyle: {
        backgroundColor: '#020617', // Deep navy blue (blue-950)
        borderTopWidth: 1,
        borderTopColor: '#1E293B', // border-blue-900
        height: 65 + insets.bottom,
        paddingBottom: 8 + insets.bottom,
        paddingTop: 8,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
      },
      headerShown: false, // Dashboard handles its own header
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <Home2 size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />,
        }}
      />
      
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, focused }) => <FolderOpen size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />,
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          href: isResponder ? null : '/(tabs)/map',
          tabBarIcon: ({ color, focused }) => <Map size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />,
        }}
      />

      <Tabs.Screen
        name="forms"
        options={{
          title: 'Forms',
          href: isResponder ? '/(tabs)/forms' : null,
          tabBarIcon: ({ color, focused }) => <CalendarAdd size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <User size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />,
        }}
      />
      </Tabs>
      <LocationPermissionDrawer
        isVisible={Boolean(role) && isLocationGateActive}
        onRequestPermission={requestPermissions}
        servicesEnabled={servicesEnabled}
      />
    </>
  );
}
