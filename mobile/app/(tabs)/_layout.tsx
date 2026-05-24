import React from 'react';
import { Tabs } from 'expo-router';
import { Home2, FolderOpen, Map, User } from 'iconsax-react-native';
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
          tabBarIcon: ({ color, focused }) => <Map size={24} color={color} variant={focused ? 'Bold' : 'Linear'} />,
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
