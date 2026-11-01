// Today's weather from Open-Meteo, which is free and needs no key, so rainy, very hot or freezing days can lean toward
// indoor and at-home ideas. Only a location rounded to about 10 km is sent, and the answer is kept for an hour.
import type { Entry } from './catalog';
import type { Coordinate } from './drive';
import { readSetting, writeSetting } from './storage';

/** Weather that makes staying in or going somewhere indoors the better bet. */
export type Mood = 'wet' | 'hot' | 'cold';

export type Weather = { code: number; tempC: number; precipMm: number };

const MAX_AGE_MS = 60 * 60 * 1000;
/** About 33 °C (91 °F) and up is too hot for most outdoor plans. */
const HOT_C = 33;
/** Below about -5 °C (23 °F) most outdoor plans stop being fun, except the winter ones. */
const COLD_C = -5;

/** Rounded to a tenth of a degree, about 10 km, which is all a forecast needs. */
const round = (n: number) => Math.round(n * 10) / 10;

/** WMO weather codes: drizzle, rain, freezing rain, snow, showers and thunderstorms. */
function isWet(code: number): boolean {
  return code >= 51;
}

export function moodOf(weather: Weather | null): Mood | null {
  if (!weather) return null;
  if (isWet(weather.code) || weather.precipMm >= 0.5) return 'wet';
  if (weather.tempC >= HOT_C) return 'hot';
  if (weather.tempC <= COLD_C) return 'cold';
  return null;
}

export const MOOD_LABELS: Record<Mood, string> = {
  wet: 'Wet out today, so more indoor and at-home ideas',
  hot: 'Very hot today, so more indoor and at-home ideas',
  cold: 'Freezing today, so more indoor and at-home ideas',
};

/** Indoors, or something to do at home or host. Ideas with no setting count as suiting any weather. */
export function suitsMood(entry: Entry, mood: Mood): boolean {
  if (entry.setting === 'indoor' || entry.home || entry.host) return true;
  if (entry.setting === 'outdoor') return mood === 'cold' && entry.months?.some((m) => m === 12 || m <= 2) === true;
  return true;
}

/** How often a pick comes from the ideas that suit the weather. The rest stay possible, so it leans rather than hides. */
const LEAN = 0.75;

/** The pool to pick from: on most picks in bad weather, only the ideas that suit it, when there are any. */
export function poolForWeather<T extends Entry>(pool: T[], mood: Mood | null, random = Math.random): T[] {
  if (!mood || random() >= LEAN) return pool;
  const suited = pool.filter((e) => suitsMood(e, mood));
  return suited.length ? suited : pool;
}

type Cached = { key: string; at: number; weather: Weather };

/** The current weather near a point, from the hour-old cache or Open-Meteo. Null when offline or the answer is odd. */
export async function fetchWeather(point: Coordinate, signal?: AbortSignal, now = Date.now()): Promise<Weather | null> {
  const lat = round(point.latitude);
  const lng = round(point.longitude);
  const key = `${lat},${lng}`;
  const cached = readSetting<Cached | null>('weather', null);
  if (cached?.key === key && now - cached.at < MAX_AGE_MS) return cached.weather;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code`;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const json = (await response.json()) as { current?: { temperature_2m?: unknown; precipitation?: unknown; weather_code?: unknown } };
    const c = json.current;
    if (!c || typeof c.temperature_2m !== 'number' || typeof c.weather_code !== 'number') return null;
    const weather: Weather = { code: c.weather_code, tempC: c.temperature_2m, precipMm: typeof c.precipitation === 'number' ? c.precipitation : 0 };
    writeSetting('weather', { key, at: now, weather } satisfies Cached);
    return weather;
  } catch {
    return null;
  }
}
