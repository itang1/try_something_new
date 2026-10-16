import { Linking } from 'react-native';
import type { Place } from './catalog';

/** Opens turn-by-turn directions in the phone's own maps app. */
export function openDirections(place: Place) {
  const destination = `${place.lat},${place.lng}`;
  const url =
    process.env.EXPO_OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(place.name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  Linking.openURL(url);
}
