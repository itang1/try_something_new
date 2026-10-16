import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppStateProvider } from '@/state/app-state';
import { ToastProvider } from '@/state/toast';
import { useColors } from '@/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useColors();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Matching the navigation theme to the app avoids white flashes between tabs on iOS 26.
  const theme = {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.background, card: colors.card },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <AppStateProvider>
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen
                name="location"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.5, 1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen
                name="done/[id]"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.card },
                }}
              />
              <Stack.Screen
                name="add"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen
                name="filters"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.75, 1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen
                name="plan/[id]"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.75, 1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen
                name="activity/[id]"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [0.75, 1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
            </Stack>
          </ToastProvider>
        </AppStateProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
