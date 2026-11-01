import { Stack } from 'expo-router';
import { useColors } from '@/theme';

export default function ExploreLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        // A plain, solid title bar. The large title grew, shrank and bounced with every scroll, so Explore keeps it still.
        headerLargeTitleEnabled: false,
        headerTransparent: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.label, fontSize: 20, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Try Something New' }} />
    </Stack>
  );
}
