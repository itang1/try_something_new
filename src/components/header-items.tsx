import type { ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'expo-symbols';

// Toolbar icons follow each platform's system set: SF Symbols on iOS, Material on Android.
export function toolbarIcon(sf: SFSymbol, android: ImageSourcePropType) {
  return process.env.EXPO_OS === 'ios' ? { sf } : { src: android };
}
