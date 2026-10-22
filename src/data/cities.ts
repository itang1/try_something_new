import losAngeles from '../../data/cities/los-angeles.json';
import columbus from '../../data/cities/columbus.json';
import { ACTIVITY_ALIASES, findEntry, resolveAliases, type City, type CitySummary, type Entry } from './catalog';
import { haversineKm, type Coordinate } from './drive';
import { applyAliases, cachedCityHashes, loadCachedCity, readSetting, saveCachedCity, writeSetting } from './storage';

// Where `npm run catalog` output is hosted. Without it the app has only the cities bundled in it.
const BASE_URL = process.env.EXPO_PUBLIC_CATALOG_URL?.replace(/\/+$/, '');

/** Bundled so the app works on first launch and offline. Downloaded versions replace them once there are any. */
const BUNDLED = new Map(([losAngeles, columbus] as City[]).map((c) => [c.id, c]));

export const DEFAULT_CITY_ID = 'los-angeles';

const summary = ({ id, name, region, country, lat, lng }: City): CitySummary => ({ id, name, region, country, lat, lng });

let index: CitySummary[] = readSetting<CitySummary[] | null>('cityIndex', null) ?? [...BUNDLED.values()].map(summary);
const loaded = new Map<string, City>();

/** Every city the catalog covers, including ones not downloaded yet. */
export function cityIndex(): CitySummary[] {
  return index;
}

export function citySummary(id: string): CitySummary | undefined {
  return index.find((c) => c.id === id) ?? (BUNDLED.has(id) ? summary(BUNDLED.get(id)!) : undefined);
}

/** The city if it's on the device, downloaded or bundled. */
export function localCity(id: string): City | undefined {
  let city = loaded.get(id);
  if (!city) {
    const cached = loadCachedCity(id);
    city = cached ? (JSON.parse(cached.json) as City) : BUNDLED.get(id);
    if (city) loaded.set(id, city);
  }
  return city;
}

function localCityIds(): string[] {
  return [...new Set([...BUNDLED.keys(), ...cachedCityHashes().keys()])];
}

/** True when the index has a newer file for the city than the device does. */
export function needsDownload(id: string): boolean {
  const hash = BASE_URL && index.find((c) => c.id === id)?.hash;
  return !!hash && cachedCityHashes().get(id) !== hash;
}

/** Downloads the city's current file. Resolves to whether anything changed. */
export async function downloadCity(id: string): Promise<boolean> {
  const hash = index.find((c) => c.id === id)?.hash;
  if (!BASE_URL || !hash) return false;
  const response = await fetch(`${BASE_URL}/cities/${id}-${hash}.json`);
  if (!response.ok) return false;
  const json = await response.text();
  const city = JSON.parse(json) as City;
  saveCachedCity(id, hash, json);
  loaded.set(id, city);
  return true;
}

/** Fetches the index, then updates any downloaded city that changed. Resolves to whether anything changed. */
export async function refreshCatalog(): Promise<boolean> {
  if (!BASE_URL) return false;
  const response = await fetch(`${BASE_URL}/index.json`);
  if (!response.ok) return false;
  const { cities } = (await response.json()) as { cities: CitySummary[] };
  const changed = JSON.stringify(cities) !== JSON.stringify(index);
  index = cities;
  writeSetting('cityIndex', cities);
  const stale = [...cachedCityHashes().keys()].filter(needsDownload);
  const updated = await Promise.all(stale.map((id) => downloadCity(id).catch(() => false)));
  return changed || updated.some(Boolean);
}

/** The closest city to a point, from the index or only from cities on the device. */
export function nearestCity(point: Coordinate, onDevice = false): { city: CitySummary; km: number } {
  const cities = onDevice ? localCityIds().map((id) => summary(localCity(id)!)) : index;
  return cities
    .map((city) => ({ city, km: haversineKm(point, city.lat, city.lng) }))
    .reduce((a, b) => (b.km < a.km ? b : a));
}

/** Finds an entry in any city on the device, using the place to pick the city when ids repeat across cities. */
export function findEntryAnywhere(id: string, placeId?: string | null): { entry: Entry; city: City } | undefined {
  const cities = localCityIds().map((c) => localCity(c)!);
  const byPlace = placeId ? cities.find((c) => c.places.some((p) => p.id === placeId)) : undefined;
  for (const city of byPlace ? [byPlace, ...cities] : cities) {
    const found = findEntry(city, id);
    if (found) return { entry: found, city };
  }
  return undefined;
}

/** Before anything reads stored ids, so renamed activities and places keep their history. Downloaded aliases apply on the next launch. */
export function applyCatalogAliases(): void {
  const places = localCityIds().map((id) => localCity(id)!.aliases ?? {});
  applyAliases({ ...resolveAliases(Object.assign({}, ...places)), ...ACTIVITY_ALIASES });
}
