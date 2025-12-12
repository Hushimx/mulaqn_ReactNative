import { Stack } from 'expo-router';

export default function MultiplayerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="join" />
      <Stack.Screen name="waiting" />
      <Stack.Screen name="ready" />
      <Stack.Screen name="game" />
      <Stack.Screen name="results" />
      <Stack.Screen name="disconnected" />
    </Stack>
  );
}

