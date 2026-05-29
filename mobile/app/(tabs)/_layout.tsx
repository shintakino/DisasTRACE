import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Home2, FolderOpen, Map, User, CalendarAdd } from 'iconsax-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useResponderStore } from '../../stores/useResponderStore';

export default function TabLayout() {
  const router = useRouter();
  const { user, role } = useAuthStatus();
  const responderStatus = useResponderStore((state) => state.status);

  const isResponder = role === 'ambulance_responder';

  useEffect(() => {
    if (isResponder && (responderStatus === 'dispatch_offered' || responderStatus === 'en_route')) {
      console.log(`[TabLayout] Responder status updated to: ${responderStatus}. Redirecting to home tab to show incident sheet.`);
      router.replace('/(tabs)');
    }
  }, [responderStatus, isResponder]);

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#FFFFFF',
      tabBarInactiveTintColor: '#94A3B8',
      tabBarStyle: {
        backgroundColor: '#020617', // Deep navy blue (blue-950)
        borderTopWidth: 1,
        borderTopColor: '#1E293B', // border-blue-900
        height: 80,
        paddingBottom: 25,
        paddingTop: 10,
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
  );
}
