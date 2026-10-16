import { Stack } from 'expo-router';
import { useColors } from '@/theme';

export default function ChecklistLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTintColor: colors.accent,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Checklist' }} />
    </Stack>
  );
}
