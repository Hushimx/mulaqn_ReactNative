import { Stack } from 'expo-router';

export default function SubscriptionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_left',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[trackId]" />
    </Stack>
  );
}

