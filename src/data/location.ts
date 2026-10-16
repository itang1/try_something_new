import * as Location from 'expo-location';
import type { HomeLocation } from '@/state/app-state';

async function placeName(latitude: number, longitude: number, fallback: string): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const city = place?.city ?? place?.subregion;
    if (city) return place.region ? `${city}, ${place.region}` : city;
  } catch {}
  return fallback;
}

/** Asks for permission if needed. Returns null if denied or unavailable. */
export async function currentLocation(): Promise<HomeLocation | null> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) return null;
  try {
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const name = await placeName(coords.latitude, coords.longitude, 'Current Location');
    return { latitude: coords.latitude, longitude: coords.longitude, name };
  } catch {
    return null;
  }
}

/** Uses the phone's built-in geocoder, which is free and needs no API key. */
export async function geocodeAddress(address: string): Promise<HomeLocation | null> {
  try {
    const [match] = await Location.geocodeAsync(address);
    if (!match) return null;
    const name = await placeName(match.latitude, match.longitude, address);
    return { latitude: match.latitude, longitude: match.longitude, name };
  } catch {
    return null;
  }
}
