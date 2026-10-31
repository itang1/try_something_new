import type { ImageSourcePropType } from 'react-native';
import { Stack } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import SettingsIcon from '@expo/material-symbols/settings.xml';

// Toolbar icons follow each platform's system set: SF Symbols on iOS, Material on Android.
export function toolbarIcon(sf: SFSymbol, android: ImageSourcePropType) {
  return process.env.EXPO_OS === 'ios' ? { sf } : { src: android };
}

/*
 * Header layout, the same on every tab:
 *   left  - empty on a tab's first screen; Back on screens pushed on top.
 *   right - this tab's one view control (filter or sort), then Settings, always last.
 * Places you go to (Memories, an activity) live in the content, not the header.
 *
 * Stack.Toolbar only accepts its own elements as direct children, so this is a function
 * that returns one, not a component: call it as `{settingsButton(colors.accent, router)}`.
 */
export function settingsButton(tint: string, router: { push: (href: '/settings') => void }) {
  return (
    <Stack.Toolbar.Button key="settings" accessibilityLabel="Settings" tintColor={tint} onPress={() => router.push('/settings')}>
      <Stack.Toolbar.Icon {...toolbarIcon('gearshape', SettingsIcon)} />
    </Stack.Toolbar.Button>
  );
}
