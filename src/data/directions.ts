import { Linking } from 'react-native';
import type { Place } from './catalog';
import type { Coordinate, TravelMode } from './drive';

// Apple Maps' URL has no cycling flag, so a bike trip opens with the app's own default.
const APPLE_FLAGS: Partial<Record<TravelMode, string>> = { drive: 'd', walk: 'w', transit: 'r' };
const GOOGLE_MODES: Record<TravelMode, string> = { drive: 'driving', walk: 'walking', bike: 'bicycling', transit: 'transit' };

export function directionsUrl(place: Place, mode: TravelMode, os = process.env.EXPO_OS): string {
  const destination = `${place.lat},${place.lng}`;
  if (os === 'ios') {
    const flag = APPLE_FLAGS[mode];
    return `http://maps.apple.com/?daddr=${destination}&q=${encodeURIComponent(place.name)}${flag ? `&dirflg=${flag}` : ''}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${GOOGLE_MODES[mode]}`;
}

/** Opens turn-by-turn directions in the phone's own maps app, for the way the person gets around. */
export function openDirections(place: Place, mode: TravelMode = 'drive') {
  Linking.openURL(directionsUrl(place, mode));
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
