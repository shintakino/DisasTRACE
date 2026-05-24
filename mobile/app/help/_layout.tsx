import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function HelpLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="camera" />
        <Stack.Screen name="preview" />
        <Stack.Screen name="form" />
        <Stack.Screen name="pending" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="resolution" />
      </Stack>
    </View>
  );
}
