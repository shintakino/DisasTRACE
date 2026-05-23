import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Map, User, ClipboardList } from 'lucide-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';

export default function TabLayout() {
  const { user } = useAuthStatus();
  const role = (user?.app_metadata?.role as string) || 'public_user';

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
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Map size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
