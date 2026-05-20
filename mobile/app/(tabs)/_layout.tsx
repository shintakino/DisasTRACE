import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Map, Bell, User, ClipboardList } from 'lucide-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';

export default function TabLayout() {
  const { user } = useAuthStatus();
  const role = (user?.app_metadata?.role as string) || 'public_user';


  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#1E3A8A',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        height: 60,
        paddingBottom: 10,
        paddingTop: 5,
      },
      headerShown: true,
      headerStyle: {
        backgroundColor: '#1E3A8A',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: role === 'ambulance_responder' ? 'Responder' : 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Map size={24} color={color} />,
          href: role === 'ambulance_responder' ? null : '/(tabs)/map',
        }}
      />

      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} />,
          href: role === 'ambulance_responder' ? '/(tabs)/logs' : null,
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
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
