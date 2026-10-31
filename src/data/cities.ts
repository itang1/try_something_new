import seedCity from './seed-city.json';
import { ACTIVITY_ALIASES, findEntry, resolveAliases, type City, type CitySummary, type Entry, type Place } from './catalog';
import { haversineKm, type Coordinate } from './drive';
import {
  applyAliases,
  citiesWithPlace,
  loadCatalogCities,
  loadCatalogPlaces,
  placesFor,
  placesInBox,
  readSetting,
  saveCatalogCity,
  writeSetting,
  type CityMeta,
} from './storage';

// Where `npm run catalog` output is hosted (see .env). Without it the app has only the cities bundled in it.
const BASE_URL = process.env.EXPO_PUBLIC_CATALOG_URL?.replace(/\/+$/, '');

/** A slim copy bundled by `npm run catalog`, so the app works on first launch and offline. The full city replaces it once downloaded. */
const BUNDLED = [seedCity] as City[];

export const DEFAULT_CITY_ID = 'los-angeles';

/** Farther than this from every city center, a place has no city: the app offers ideas that need no venue. */
export const AREA_KM = 150;

export const ANYWHERE_ID = 'anywhere';

/**
 * Stands in for a city when there's no location, or it's far from every city. With no places, its list is just the ideas
 * that work anywhere: at home, hosting friends, anywhere outside, or a maps search. One object, so its entries are cached.
 */
export const ANYWHERE: City = { id: ANYWHERE_ID, name: 'your area', country: '', lat: 39.8, lng: -98.6, icons: [], places: [] };

/** The city a location belongs to, or `ANYWHERE_ID` without one or when it's far from every city. */
export function cityIdFor(point: Coordinate | null): string {
  if (!point) return ANYWHERE_ID;
  const { city, km } = nearestCity(point);
  return km <= AREA_KM ? city.id : ANYWHERE_ID;
}

const summary = ({ id, name, region, country, lat, lng }: CitySummary): CitySummary => ({ id, name, region, country, lat, lng });

/** Every city on the device, without places, and the hash of its download. Bundled cities have a null hash. */
let onDevice = new Map<string, { meta: CityMeta; hash: string | null }>();

function readOnDevice(): void {
  onDevice = new Map(loadCatalogCities().map((c) => [c.meta.id, c]));
}

// A bundled city goes into the tables when the device has no copy, or only an older bundled one.
const seedKey = (city: City) => `${city.id}:${city.places.length}:${JSON.stringify(city).length}`;
readOnDevice();
for (const city of BUNDLED) {
  const stored = onDevice.get(city.id);
  const key = `seededCity:${city.id}`;
  if (!stored || (stored.hash === null && readSetting(key, '') !== seedKey(city))) {
    saveCatalogCity(city, null);
    writeSetting(key, seedKey(city));
  }
}
readOnDevice();

let index: CitySummary[] = readSetting<CitySummary[] | null>('cityIndex', null) ?? BUNDLED.map(summary);

// Only the city in use is kept whole in memory. Others are read from their tables when needed.
let loaded: City | undefined;

/** Every city the catalog covers, including ones not downloaded yet. */
export function cityIndex(): CitySummary[] {
  return index;
}

export function citySummary(id: string): CitySummary | undefined {
  const meta = onDevice.get(id)?.meta;
  return index.find((c) => c.id === id) ?? (meta ? summary(meta) : undefined);
}

/** The city if it's on the device, downloaded or bundled. */
export function localCity(id: string): City | undefined {
  if (id === ANYWHERE_ID) return ANYWHERE;
  if (loaded?.id === id) return loaded;
  const stored = onDevice.get(id);
  if (!stored) return undefined;
  loaded = { ...stored.meta, places: loadCatalogPlaces(id) };
  return loaded;
}

/** True when the index has a newer file for the city than the device does. */
export function needsDownload(id: string): boolean {
  const hash = BASE_URL && index.find((c) => c.id === id)?.hash;
  return !!hash && onDevice.get(id)?.hash !== hash;
}

/** Downloads the city's current file. Resolves to whether anything changed. */
export async function downloadCity(id: string): Promise<boolean> {
  const hash = index.find((c) => c.id === id)?.hash;
  if (!BASE_URL || !hash) return false;
  const response = await fetch(`${BASE_URL}/cities/${id}-${hash}.json`);
  if (!response.ok) return false;
  const city = (await response.json()) as City;
  saveCatalogCity(city, hash);
  readOnDevice();
  if (loaded?.id === id) loaded = undefined;
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
  const downloaded = [...onDevice.values()].filter((c) => c.hash !== null).map((c) => c.meta.id);
  const updated = await Promise.all(downloaded.filter(needsDownload).map((id) => downloadCity(id).catch(() => false)));
  return changed || updated.some(Boolean);
}

/** The closest city to a point, from the index or only from cities on the device. */
export function nearestCity(point: Coordinate, onDeviceOnly = false): { city: CitySummary; km: number } {
  const cities = onDeviceOnly ? [...onDevice.values()].map((c) => summary(c.meta)) : index;
  return cities
    .map((city) => ({ city, km: haversineKm(point, city.lat, city.lng) }))
    .reduce((a, b) => (b.km < a.km ? b : a));
}

/** The city's places within a radius, read by bounding box. Nearest first. */
export function placesNear(cityId: string, point: Coordinate, km: number): Place[] {
  const dLat = km / 111;
  const dLng = km / (111 * Math.max(0.1, Math.cos((point.latitude * Math.PI) / 180)));
  return placesInBox(cityId, {
    south: point.latitude - dLat,
    north: point.latitude + dLat,
    west: point.longitude - dLng,
    east: point.longitude + dLng,
  })
    .map((p) => ({ p, d: haversineKm(point, p.lat, p.lng) }))
    .filter(({ d }) => d <= km)
    .sort((a, b) => a.d - b.d)
    .map(({ p }) => p);
}

// Routing only times the nearest places, so the box grows until it holds enough of them.
const SEARCH_KM = [3, 10, 30, 100];

/** The city's nearest places, without reading the whole city. */
export function nearestPlaces(cityId: string, point: Coordinate, count: number): Place[] {
  if (cityId === ANYWHERE_ID) return [];
  for (const km of SEARCH_KM) {
    const near = placesNear(cityId, point, km);
    if (near.length >= count) return near.slice(0, count);
  }
  return placesNear(cityId, point, 20_000).slice(0, count);
}

/** A city's own fields with no places, for entries the user added there. */
export function cityWithoutPlaces(id: string): City | undefined {
  if (id === ANYWHERE_ID) return ANYWHERE;
  const meta = onDevice.get(id)?.meta;
  return meta && { ...meta, places: [] };
}

/**
 * Just enough of a city to find one entry in it: the city's own fields, and only the places for that activity or
 * place. Cities other than the one in use are read this way, so looking through history doesn't load them whole.
 */
function cityFor(cityId: string, entryId: string, placeId?: string | null): City | undefined {
  if (loaded?.id === cityId) return loaded;
  const stored = onDevice.get(cityId);
  if (!stored) return undefined;
  const icon = stored.meta.icons.find((i) => i.id === entryId);
  const placeIds = [icon?.place, placeId].filter((p): p is string => !!p);
  return { ...stored.meta, places: placesFor(cityId, icon?.activity ?? entryId, placeIds) };
}

/** Finds an entry in any city on the device, using the place to pick the city when ids repeat across cities. */
export function findEntryAnywhere(id: string, placeId?: string | null): { entry: Entry; city: City } | undefined {
  const byPlace = placeId ? citiesWithPlace(placeId) : [];
  const order = [...new Set([...byPlace, ...(loaded ? [loaded.id] : []), ...onDevice.keys()])];
  for (const cityId of order) {
    const city = cityFor(cityId, id, placeId);
    const found = city && findEntry(city, id);
    if (found) return { entry: found, city: city! };
  }
  const found = findEntry(ANYWHERE, id);
  return found && { entry: found, city: ANYWHERE };
}

/** Before anything reads stored ids, so renamed activities and places keep their history. Downloaded aliases apply on the next launch. */
export function applyCatalogAliases(): void {
  const places = [...onDevice.values()].map((c) => c.meta.aliases ?? {});
  applyAliases({ ...resolveAliases(Object.assign({}, ...places)), ...ACTIVITY_ALIASES });
}
