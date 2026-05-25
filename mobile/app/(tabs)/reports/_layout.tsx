import React from 'react';
import { Stack } from 'expo-router';
import { useAuthStatus } from '../../../hooks/use-auth-status';

export default function ReportsLayout() {
  const { role } = useAuthStatus();
  const isResponder = role?.includes('responder');

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          presentation: isResponder ? 'transparentModal' : 'card',
          animation: isResponder ? 'slide_from_bottom' : 'default'
        }} 
      />
    </Stack>
  );
}
