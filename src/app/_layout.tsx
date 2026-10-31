// First, so crash reporting is running before anything else loads.
import { wrap, wrapErrorBoundary } from '@/crash-reporting';
import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, type Href } from 'expo-router';
import { useColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppStateProvider } from '@/state/app-state';
import { ToastProvider } from '@/state/toast';
import { NudgeSync, PlanReminderSync } from '@/state/nudge-sync';
import { WidgetSync } from '@/state/widget-sync';
import { useColors } from '@/theme';
import { CrashScreen } from '@/components/crash-screen';

// A screen that throws while rendering shows a friendly retry screen instead of crashing the app.
export const ErrorBoundary = wrapErrorBoundary(CrashScreen);

/** Opens the idea a weekend nudge or plan reminder is about, whether the app was running or not. */
function useNudgeTaps() {
  useEffect(() => {
    const open = (notification: Notifications.Notification) => {
      const url = notification.request.content.data?.url;
      if (typeof url === 'string') {
        router.push(url as Href);
        Notifications.clearLastNotificationResponse();
      }
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) open(last.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => subscription.remove();
  }, []);
}

function RootLayout() {
  useNudgeTaps();
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
          <WidgetSync />
          <NudgeSync />
          <PlanReminderSync />
          <ToastProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="welcome" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="quick-start" options={{ presentation: 'fullScreenModal' }} />
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
                name="share/[id]"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetGrabberVisible: true,
                  contentStyle: { backgroundColor: colors.background },
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
                name="settings"
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

export default wrap(RootLayout);
