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

/** Real drive minutes by place id. A null means the router found no route. */
export type DriveTimes = ReadonlyMap<string, number | null>;

/** Real drive minutes when known, otherwise an estimate at about 50 km/h. */
export function minutesTo(place: Place, from: Coordinate, times?: DriveTimes): number {
  return times?.get(place.id) ?? Math.max(1, Math.floor((haversineKm(from, place.lat, place.lng) / 50) * 60));
}

/** Minutes to the nearest place. */
export function driveMinutes(entry: Entry, from: Coordinate | null, times?: DriveTimes): number | null {
  if (!from || !entry.places.length) return null;
  return Math.min(...entry.places.map((p) => minutesTo(p, from, times)));
}

/** Places sorted nearest first, with drive minutes when there's an origin. */
export function placesByDistance(
  entry: Entry,
  from: Coordinate | null,
  times?: DriveTimes,
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
