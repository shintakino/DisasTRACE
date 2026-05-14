import { Stack } from 'expo-router';

export default function VerificationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="pending" options={{ title: 'Verification Pending' }} />
      <Stack.Screen name="rejected" options={{ title: 'Registration Rejected' }} />
      <Stack.Screen name="unauthorized" options={{ title: 'Unauthorized Platform' }} />
    </Stack>
  );
}
