import type { Place } from './catalog';
import { haversineKm, travelMode, type Coordinate, type TravelMode, type TravelTimes } from './drive';
import { loadDriveTimes, saveDriveTimes } from './storage';

// The proxy in server/drive-times holds the routing key. A key in .env.local calls OpenRouteService directly, for development.
const PROXY_URL = process.env.EXPO_PUBLIC_ROUTING_URL;
const KEY = process.env.EXPO_PUBLIC_ORS_KEY;
const MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/';
// OpenRouteService's name for each mode it routes.
const PROFILES: Partial<Record<TravelMode, string>> = { drive: 'driving-car', walk: 'foot-walking', bike: 'cycling-regular' };
// Only the closest places get real times, so routing costs stay flat however big a city gets. The rest keep the estimate.
export const NEAREST_TIMED = 25;
const MAX_AGE_DAYS = 30;

/** Rounded to about a kilometer, so small moves reuse the cache. Drive times keep the key they had before other modes. */
function originKey(origin: Coordinate, mode: TravelMode): string {
  const key = `${origin.latitude.toFixed(2)},${origin.longitude.toFixed(2)}`;
  return mode === 'drive' ? key : `${mode}:${key}`;
}

export function cachedTravelTimes(origin: Coordinate, mode: TravelMode): TravelTimes {
  return { mode, minutes: travelMode(mode).routed ? loadDriveTimes(originKey(origin, mode), MAX_AGE_DAYS) : new Map() };
}

/**
 * Fetches real times for the nearest places missing from the cache. Without a proxy or key, or for transit, which no free
 * router covers, it returns the cache as is and the app estimates.
 */
export async function refreshTravelTimes(
  origin: Coordinate,
  places: Place[],
  cached: TravelTimes,
  signal: AbortSignal,
): Promise<TravelTimes> {
  const { mode } = cached;
  if ((!PROXY_URL && !KEY) || !PROFILES[mode]) return cached;
  const missing = places
    .map((p) => ({ p, km: haversineKm(origin, p.lat, p.lng) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, NEAREST_TIMED)
    .map(({ p }) => p)
    .filter((p) => !cached.minutes.has(p.id));
  if (!missing.length) return cached;
  const fresh = PROXY_URL
    ? await fromProxy(origin, missing, mode, signal)
    : await fromOpenRouteService(origin, missing, mode, signal);
  if (fresh.size) saveDriveTimes(originKey(origin, mode), fresh);
  return { mode, minutes: new Map([...cached.minutes, ...fresh]) };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

async function fromProxy(
  origin: Coordinate,
  places: Place[],
  mode: TravelMode,
  signal: AbortSignal,
): Promise<Map<string, number | null>> {
  const response = await fetch(PROXY_URL!, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Rounded to about a kilometer on the phone, so the exact spot never leaves it. The Worker rounds the same way.
      origin: [round2(origin.longitude), round2(origin.latitude)],
      places: places.map(({ id, lat, lng }) => ({ id, lat, lng })),
      mode,
    }),
  });
  if (!response.ok) return new Map();
  const body = (await response.json()) as { minutes: Record<string, number | null>; mode?: TravelMode };
  // A Worker deployed before other modes ignores the mode and answers with drive times, which mustn't be cached as walking.
  if ((body.mode ?? 'drive') !== mode) return new Map();
  return new Map(Object.entries(body.minutes));
}

async function fromOpenRouteService(
  origin: Coordinate,
  places: Place[],
  mode: TravelMode,
  signal: AbortSignal,
): Promise<Map<string, number | null>> {
  const response = await fetch(MATRIX_URL + PROFILES[mode], {
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
