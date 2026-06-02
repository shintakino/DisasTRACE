import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home2, FolderOpen, Map, User, CalendarAdd } from 'iconsax-react-native';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useResponderStore } from '../../stores/useResponderStore';
import { supabase } from '../../lib/supabase';

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

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (user && role === 'ambulance_responder') {
          try {
            console.log('[TabLayout] App moved to background/inactive, setting responder to OFF_DUTY...');
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            fetch(`${apiUrl}/api/users/duty-status`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ dutyStatus: 'OFF_DUTY' }),
            }).then((response) => {
              if (response.ok) {
                console.log('[TabLayout] Successfully updated dutyStatus to OFF_DUTY on background transition');
              } else {
                console.warn('[TabLayout] Failed to update dutyStatus on background transition:', response.status);
              }
            }).catch((err) => {
              console.error('[TabLayout] Network error when setting dutyStatus to OFF_DUTY:', err);
            });
          } catch (error) {
            console.error('[TabLayout] Error getting session or setting dutyStatus:', error);
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [user, role]);

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
