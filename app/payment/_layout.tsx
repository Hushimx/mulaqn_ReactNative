import { Stack } from 'expo-router';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="webview" />
      <Stack.Screen name="moyasar" />
      <Stack.Screen name="success" />
      <Stack.Screen name="error" />
    </Stack>
  );
}

