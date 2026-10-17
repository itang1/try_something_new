import type { Place } from './catalog';
import type { Coordinate, DriveTimes } from './drive';
import { loadDriveTimes, saveDriveTimes } from './storage';

const KEY = process.env.EXPO_PUBLIC_ORS_KEY;
const MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';
// The matrix endpoint allows 3,500 locations per request, origin included.
const BATCH = 3000;
const MAX_AGE_DAYS = 30;

/** Rounded to about a kilometer, so small moves reuse the cache. */
function originKey(origin: Coordinate): string {
  return `${origin.latitude.toFixed(2)},${origin.longitude.toFixed(2)}`;
}

export function cachedDriveTimes(origin: Coordinate): Map<string, number | null> {
  return loadDriveTimes(originKey(origin), MAX_AGE_DAYS);
}

/** Fetches real drive times for places missing from the cache. Without a key it returns the cache as is. */
export async function refreshDriveTimes(
  origin: Coordinate,
  places: Place[],
  cached: DriveTimes,
  signal: AbortSignal,
): Promise<DriveTimes> {
  const missing = places.filter((p) => !cached.has(p.id));
  if (!KEY || !missing.length) return cached;
  const fresh = new Map<string, number | null>();
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const response = await fetch(MATRIX_URL, {
      method: 'POST',
      signal,
      headers: { Authorization: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [[origin.longitude, origin.latitude], ...batch.map((p) => [p.lng, p.lat])],
        sources: [0],
        metrics: ['duration'],
      }),
    });
    if (!response.ok) break;
    const { durations } = (await response.json()) as { durations: (number | null)[][] };
    // The first destination is the origin itself.
    durations[0].slice(1).forEach((seconds, j) => {
      fresh.set(batch[j].id, seconds == null ? null : Math.max(1, Math.round(seconds / 60)));
    });
  }
  if (fresh.size) saveDriveTimes(originKey(origin), fresh);
  return new Map([...cached, ...fresh]);
}
