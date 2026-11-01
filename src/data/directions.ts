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

// Naver Map and KakaoMap name the ways to get around differently.
const NAVER_MODES: Record<TravelMode, string> = { drive: 'car', walk: 'walk', bike: 'bicycle', transit: 'public' };
const KAKAO_MODES: Record<TravelMode, string> = { drive: 'CAR', walk: 'FOOT', bike: 'BICYCLE', transit: 'PUBLICTRANSIT' };
/** Naver asks apps that open it to say who they are. */
const APP_ID = 'com.poodlestrategy.trysomethingnew';

/** Roughly South Korea, mainland and Jeju. Google Maps has no driving or walking directions there. */
export function inKorea({ lat, lng }: { lat: number; lng: number }): boolean {
  return lat > 32.9 && lat < 38.65 && lng > 124.5 && lng < 131.0;
}

/**
 * Where to send someone for directions, best first. On Android in South Korea that's Naver Map, then KakaoMap, which
 * both route there, before Google Maps. Everywhere else, and on iPhone where Apple Maps routes in Korea, just one.
 */
export function directionsUrls(place: Place, mode: TravelMode, os = process.env.EXPO_OS): string[] {
  const fallback = directionsUrl(place, mode, os);
  if (os !== 'android' || !inKorea(place)) return [fallback];
  const naver = `nmap://route/${NAVER_MODES[mode]}?dlat=${place.lat}&dlng=${place.lng}&dname=${encodeURIComponent(place.name)}&appname=${APP_ID}`;
  const kakao = `kakaomap://route?ep=${place.lat},${place.lng}&by=${KAKAO_MODES[mode]}`;
  return [naver, kakao, fallback];
}

/** Opens turn-by-turn directions in the phone's own maps app, for the way the person gets around. */
export async function openDirections(place: Place, mode: TravelMode = 'drive') {
  const urls = directionsUrls(place, mode);
  for (const [i, url] of urls.entries()) {
    try {
      await Linking.openURL(url);
      return;
    } catch (e) {
      // The app isn't installed, so try the next one. The last one is a web link, which always opens.
      if (i === urls.length - 1) throw e;
    }
  }
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
