import { Linking } from 'react-native';
import type { Place } from './catalog';
import type { Coordinate } from './drive';

/** Opens turn-by-turn directions in the phone's own maps app. */
export function openDirections(place: Place) {
  const destination = `${place.lat},${place.lng}`;
  const url =
    process.env.EXPO_OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(place.name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  Linking.openURL(url);
}

/** Searches the phone's maps app near a point, for activities whose places the catalog can't list. */
export function searchNearby(query: string, near: Coordinate | null) {
  const q = encodeURIComponent(query);
  const url =
    process.env.EXPO_OS === 'ios'
      ? `http://maps.apple.com/?q=${q}${near ? `&sll=${near.latitude},${near.longitude}` : ''}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
  Linking.openURL(url);
}
