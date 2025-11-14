import { Stack } from 'expo-router';

export default function AssessmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="[id]/instructions" />
      <Stack.Screen name="[id]/take" />
      <Stack.Screen name="[id]/results" />
      <Stack.Screen name="[id]/review" />
    </Stack>
  );
}

