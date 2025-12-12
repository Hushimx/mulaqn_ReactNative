import { Stack } from 'expo-router';

export default function TracksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/performance" />
      <Stack.Screen name="[id]/lessons" />
      <Stack.Screen name="[id]/chat" />
    </Stack>
  );
}

