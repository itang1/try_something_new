import { Stack } from 'expo-router';
import { useColors } from '@/theme';

export default function ChecklistLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.label },
        headerLargeTitleStyle: { color: colors.label },
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Checklist' }} />
      <Stack.Screen name="memories" options={{ title: 'Memories', headerBackTitle: 'Checklist' }} />
    </Stack>
  );
}
