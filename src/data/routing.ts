import type { Place } from './catalog';
import { haversineKm, type Coordinate, type DriveTimes } from './drive';
import { loadDriveTimes, saveDriveTimes } from './storage';

// The proxy in server/drive-times holds the routing key. A key in .env.local calls OpenRouteService directly, for development.
const PROXY_URL = process.env.EXPO_PUBLIC_ROUTING_URL;
const KEY = process.env.EXPO_PUBLIC_ORS_KEY;
const MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';
// Only the closest places get real times, so routing costs stay flat however big a city gets. The rest keep the estimate.
export const NEAREST_TIMED = 25;
const MAX_AGE_DAYS = 30;

/** Rounded to about a kilometer, so small moves reuse the cache. */
function originKey(origin: Coordinate): string {
  return `${origin.latitude.toFixed(2)},${origin.longitude.toFixed(2)}`;
}

export function cachedDriveTimes(origin: Coordinate): Map<string, number | null> {
  return loadDriveTimes(originKey(origin), MAX_AGE_DAYS);
}

/** Fetches real drive times for the nearest places missing from the cache. Without a proxy or key it returns the cache as is. */
export async function refreshDriveTimes(
  origin: Coordinate,
  places: Place[],
  cached: DriveTimes,
  signal: AbortSignal,
): Promise<DriveTimes> {
  if (!PROXY_URL && !KEY) return cached;
  const missing = places
    .map((p) => ({ p, km: haversineKm(origin, p.lat, p.lng) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, NEAREST_TIMED)
    .map(({ p }) => p)
    .filter((p) => !cached.has(p.id));
  if (!missing.length) return cached;
  const fresh = PROXY_URL ? await fromProxy(origin, missing, signal) : await fromOpenRouteService(origin, missing, signal);
  if (fresh.size) saveDriveTimes(originKey(origin), fresh);
  return new Map([...cached, ...fresh]);
}

async function fromProxy(origin: Coordinate, places: Place[], signal: AbortSignal): Promise<Map<string, number | null>> {
  const response = await fetch(PROXY_URL!, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: [origin.longitude, origin.latitude],
      places: places.map(({ id, lat, lng }) => ({ id, lat, lng })),
    }),
  });
  if (!response.ok) return new Map();
  const { minutes } = (await response.json()) as { minutes: Record<string, number | null> };
  return new Map(Object.entries(minutes));
}

async function fromOpenRouteService(origin: Coordinate, places: Place[], signal: AbortSignal): Promise<Map<string, number | null>> {
  const response = await fetch(MATRIX_URL, {
    method: 'POST',
    signal,
    headers: { Authorization: KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: [[origin.longitude, origin.latitude], ...places.map((p) => [p.lng, p.lat])],
      sources: [0],
      metrics: ['duration'],
    }),
  });
  if (!response.ok) return new Map();
  const { durations } = (await response.json()) as { durations: (number | null)[][] };
  // The first destination is the origin itself.
  return new Map(
    places.map((p, j) => {
      const seconds = durations[0][j + 1];
      return [p.id, seconds == null ? null : Math.max(1, Math.round(seconds / 60))];
    }),
  );
}
