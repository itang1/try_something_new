import type { Activity } from './catalog';

export type Coordinate = { latitude: number; longitude: number };

function haversineKm(a: Coordinate, lat: number, lng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat - a.latitude);
  const dLng = toRad(lng - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Estimated minutes to the nearest venue in the city, assuming about 50 km/h. */
export function driveMinutes(activity: Activity, from: Coordinate | null, cityName: string): number | null {
  const venues = activity.venues[cityName];
  if (!from || !venues?.length) return null;
  const km = Math.min(...venues.map((v) => haversineKm(from, v.lat, v.lng)));
  return Math.max(1, Math.floor((km / 50) * 60));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
