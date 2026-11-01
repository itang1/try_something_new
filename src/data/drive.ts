import type { IconName } from '@/icons/paths';
import type { Entry, Place } from './catalog';

export type Coordinate = { latitude: number; longitude: number };

export function haversineKm(a: Coordinate, lat: number, lng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** How someone gets to places. Times, the map's directions and the time filter all follow it. */
export type TravelMode = 'drive' | 'walk' | 'bike' | 'transit';

export const TRAVEL_MODES: {
  id: TravelMode;
  label: string;
  icon: IconName;
  /** Finishes "12 min …" for screen readers. */
  noun: string;
  /** OpenRouteService routes it. Transit has no free router, so it's always an estimate. */
  routed: boolean;
}[] = [
  { id: 'drive', label: 'Drive', icon: 'directions_car', noun: 'drive', routed: true },
  { id: 'walk', label: 'Walk', icon: 'directions_walk', noun: 'walk', routed: true },
  { id: 'bike', label: 'Bike', icon: 'directions_bike', noun: 'bike ride', routed: true },
  { id: 'transit', label: 'Transit', icon: 'directions_bus', noun: 'by transit', routed: false },
];

export function travelMode(id: TravelMode) {
  return TRAVEL_MODES.find((m) => m.id === id) ?? TRAVEL_MODES[0];
}

/** Real minutes by place id for one way of getting around. A null means the router found no route. */
export type TravelTimes = { mode: TravelMode; minutes: ReadonlyMap<string, number | null> };

export const NO_TIMES: TravelTimes = { mode: 'drive', minutes: new Map() };

// Straight-line speeds, slowed for streets that don't go straight there.
const KMH: Record<Exclude<TravelMode, 'transit'>, number> = { drive: 50, walk: 4.5, bike: 14 };
// Transit: getting to the stop and waiting, then about 18 km/h door to door. A short trip is quicker on foot.
const TRANSIT_OVERHEAD_MIN = 12;
const TRANSIT_KMH = 18;

/** Minutes for a straight-line distance when there's no real route. */
export function estimateMinutes(km: number, mode: TravelMode): number {
  const at = (kmh: number) => (km / kmh) * 60;
  const minutes = mode === 'transit' ? Math.min(at(KMH.walk), TRANSIT_OVERHEAD_MIN + at(TRANSIT_KMH)) : at(KMH[mode]);
  return Math.max(1, Math.floor(minutes));
}

/** Real minutes when known, otherwise an estimate for the way of getting around. */
export function minutesTo(place: Place, from: Coordinate, times: TravelTimes = NO_TIMES): number {
  return times.minutes.get(place.id) ?? estimateMinutes(haversineKm(from, place.lat, place.lng), times.mode);
}

/** Minutes to the nearest place. */
export function driveMinutes(entry: Entry, from: Coordinate | null, times?: TravelTimes): number | null {
  if (!from || !entry.places.length) return null;
  return Math.min(...entry.places.map((p) => minutesTo(p, from, times)));
}

/** Places sorted nearest first, with minutes when there's an origin. */
export function placesByDistance(
  entry: Entry,
  from: Coordinate | null,
  times?: TravelTimes,
): { place: Place; minutes: number | null }[] {
  const rows = entry.places.map((place) => ({ place, minutes: from ? minutesTo(place, from, times) : null }));
  return from ? rows.sort((a, b) => a.minutes! - b.minutes!) : rows;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
