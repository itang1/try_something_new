import { Stack } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import SunnyIcon from '@expo/material-symbols/sunny.xml';
import EcoIcon from '@expo/material-symbols/eco.xml';
import LocationIcon from '@expo/material-symbols/location_on.xml';
import { CITIES } from '@/data/catalog';
import type { HomeLocation } from '@/state/app-state';

// Toolbar icons follow each platform's system set: SF Symbols on iOS, Material on Android.
export function toolbarIcon(sf: SFSymbol, android: ImageSourcePropType) {
  return process.env.EXPO_OS === 'ios' ? { sf } : { src: android };
}

const CITY_ICONS: Record<string, { sf: SFSymbol; android: ImageSourcePropType }> = {
  'Los Angeles': { sf: 'sun.max.fill', android: SunnyIcon },
  Columbus: { sf: 'leaf.fill', android: EcoIcon },
};

function cityIcon(name: string) {
  const icon = CITY_ICONS[name] ?? CITY_ICONS['Los Angeles'];
  return toolbarIcon(icon.sf, icon.android);
}

const IOS = process.env.EXPO_OS === 'ios';

// These return toolbar elements rather than being components, because Stack.Toolbar
// expects its menu and button items as direct children.
// iOS hides a label whenever an icon is set, and Android hides labels, so each platform gets one.
export function cityMenu(city: string, setCity: (city: string) => void, tint: string) {
  return (
    <Stack.Toolbar.Menu key="city" accessibilityLabel="Choose city" tintColor={tint}>
      {IOS ? <Stack.Toolbar.Label>{city}</Stack.Toolbar.Label> : <Stack.Toolbar.Icon {...cityIcon(city)} />}
      {CITIES.map((c) => (
        <Stack.Toolbar.MenuAction
          key={c.id}
          icon={IOS ? CITY_ICONS[c.name]?.sf : CITY_ICONS[c.name]?.android}
          isOn={c.name === city}
          onPress={() => setCity(c.name)}
        >
          {c.name}
        </Stack.Toolbar.MenuAction>
      ))}
    </Stack.Toolbar.Menu>
  );
}

export function locationButton(location: HomeLocation | null, onPress: () => void, tint: string) {
  return (
    <Stack.Toolbar.Button key="location" onPress={onPress} accessibilityLabel="Set your location" tintColor={tint}>
      {IOS ? (
        <Stack.Toolbar.Label>{location?.name ?? 'Set Location'}</Stack.Toolbar.Label>
      ) : (
        <Stack.Toolbar.Icon {...toolbarIcon('location', LocationIcon)} />
      )}
    </Stack.Toolbar.Button>
  );
}
