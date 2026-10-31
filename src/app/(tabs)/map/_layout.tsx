import { Stack } from 'expo-router';
import { useColors } from '@/theme';

// A see-through header, so the Map gets the same header buttons as the other tabs without covering the map.
export default function MapLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Map', headerTitle: '' }} />
    </Stack>
  );
}
