import activitiesFile from '../../data/activities.json';
import losAngeles from '../../data/cities/los-angeles.json';
import columbus from '../../data/cities/columbus.json';
import iconMapping from '../../design/icon-mapping.json';
import { haversineKm, type Coordinate } from './drive';
import type { IconName } from '@/icons/paths';

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activities: string[];
  duration?: string;
  cost?: string;
};

/** Something to try, like archery or an art museum. It's done once, at any of its places. */
export type Activity = { id: string; name: string; subcategory: string; duration: string; cost: string };

/** A city's must-do, tied to one place. Doing it also counts toward its activity. */
export type CityIcon = Activity & { place: string; activity: string };

export type City = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  icons: CityIcon[];
  places: Place[];
};

/** A row in a city's list: an activity with its places there, or a city icon. */
export type Entry = {
  id: string;
  kind: 'activity' | 'icon';
  name: string;
  icon: IconName;
  subcategory: string;
  duration: string;
  cost: string;
  durationMinutes: number;
  costLevel: number;
  activityId: string;
  places: Place[];
};

export const CITIES = [losAngeles, columbus] as City[];

const ACTIVITIES = new Map((activitiesFile.activities as Activity[]).map((a) => [a.id, a]));
const icons = iconMapping as Record<string, { material: string }>;

const DURATION_MINUTES: Record<string, number> = {
  '30 min': 30,
  '1 hour': 60,
  '1-2 hours': 90,
  '2-3 hours': 150,
  'Half day': 240,
  'Full day': 480,
};
const COST_LEVEL: Record<string, number> = { Free: 0, $: 1, $$: 2, $$$: 3 };

function entry(base: Activity, kind: Entry['kind'], activityId: string, places: Place[]): Entry {
  return {
    id: base.id,
    kind,
    name: base.name,
    icon: icons[base.id].material as IconName,
    subcategory: base.subcategory,
    duration: base.duration,
    cost: base.cost,
    durationMinutes: DURATION_MINUTES[base.duration] ?? 0,
    costLevel: COST_LEVEL[base.cost] ?? 0,
    activityId,
    places,
  };
}

function buildEntries(city: City): Entry[] {
  const placesByActivity = new Map<string, Place[]>();
  for (const p of city.places) {
    for (const id of p.activities) placesByActivity.set(id, [...(placesByActivity.get(id) ?? []), p]);
  }
  const placeById = new Map(city.places.map((p) => [p.id, p]));
  const activities = [...placesByActivity].map(([id, places]) => entry(ACTIVITIES.get(id)!, 'activity', id, places));
  const cityIcons = city.icons.map((i) => entry(i, 'icon', i.activity, [placeById.get(i.place)!]));
  return [...activities, ...cityIcons].sort((a, b) => a.name.localeCompare(b.name));
}

const ENTRIES = new Map(CITIES.map((c) => [c.id, buildEntries(c)]));

export function entriesForCity(cityId: string): Entry[] {
  return ENTRIES.get(cityId) ?? [];
}

export function findEntry(cityId: string, id: string): Entry | undefined {
  return entriesForCity(cityId).find((e) => e.id === id);
}

export function cityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

/** The covered city closest to a point, with its distance from the city center. */
export function nearestCity(point: Coordinate): { city: City; km: number } {
  return CITIES.map((city) => ({ city, km: haversineKm(point, city.lat, city.lng) })).reduce((a, b) =>
    b.km < a.km ? b : a,
  );
}

export function placeNames(entry: Entry): string {
  return entry.places.map((p) => p.name).join(', ');
}
