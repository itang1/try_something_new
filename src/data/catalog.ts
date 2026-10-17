import activitiesFile from '../../data/activities.json';
import losAngeles from '../../data/cities/los-angeles.json';
import columbus from '../../data/cities/columbus.json';
import iconMapping from '../../design/icon-mapping.json';
import { haversineKm, type Coordinate } from './drive';
import type { IconName } from '@/icons/paths';
import { subcategory } from '@/theme';

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activities: string[];
  duration?: string;
  cost?: string;
};

/** Something to try, like archery or an art museum. It's done once, at any of its places or in one of its other ways. */
export type Activity = { id: string; name: string; subcategory: string; duration: string; cost: string; level: Level } & Ways;

/** Ways to do an activity without one of its places: what you'd need at home, how to host it, or a maps search. */
export type Ways = { home?: string; host?: string; search?: string };

/** How far outside a comfort zone it is. Starting easy and building up keeps people going. */
export type Level = 'easy' | 'medium' | 'stretch';

export const LEVELS: Record<Level, { label: string; icon: IconName; rank: number }> = {
  easy: { label: 'Easy', icon: 'eco', rank: 0 },
  medium: { label: 'A bit new', icon: 'trending_up', rank: 1 },
  stretch: { label: 'Stretch', icon: 'bolt', rank: 2 },
};

/** A city's must-do, tied to one place. Doing it also counts toward its activity, and shares its level unless set. */
export type CityIcon = Omit<Activity, 'level'> & { level?: Level; place: string; activity: string };

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
  level: Level;
  activityId: string;
  places: Place[];
  /** Added by the user, so it has no places and can be deleted. */
  custom: boolean;
} & Ways;

/** Something the user added to a city's list themselves. */
export type CustomActivity = { id: string; cityId: string; name: string; subcategory: string; duration: string; cost: string };

export const DURATIONS = ['1 hour', '1-2 hours', '2-3 hours', 'Half day', 'Full day'];
export const COSTS = ['Free', '$', '$$', '$$$'];

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

function entry(base: Activity | CityIcon, kind: Entry['kind'], activityId: string, places: Place[]): Entry {
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
    level: base.level ?? ACTIVITIES.get(activityId)?.level ?? 'medium',
    activityId,
    places,
    custom: false,
    ...(kind === 'activity' && { home: base.home, host: base.host, search: base.search }),
  };
}

export function customEntry(c: CustomActivity): Entry {
  return {
    id: c.id,
    kind: 'activity',
    name: c.name,
    icon: subcategory(c.subcategory).icon,
    subcategory: c.subcategory,
    duration: c.duration,
    cost: c.cost,
    durationMinutes: DURATION_MINUTES[c.duration] ?? 0,
    costLevel: COST_LEVEL[c.cost] ?? 0,
    level: 'medium',
    activityId: c.id,
    places: [],
    custom: true,
  };
}

function buildEntries(city: City): Entry[] {
  const placesByActivity = new Map<string, Place[]>();
  for (const p of city.places) {
    for (const id of p.activities) placesByActivity.set(id, [...(placesByActivity.get(id) ?? []), p]);
  }
  const placeById = new Map(city.places.map((p) => [p.id, p]));
  const activities = [...ACTIVITIES.values()]
    // Activities that need no venue show up in every city.
    .filter((a) => placesByActivity.has(a.id) || a.home || a.host || a.search)
    .map((a) => entry(a, 'activity', a.id, placesByActivity.get(a.id) ?? []));
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

/** Finds an entry in any city, using the place to pick the city when ids repeat across cities. */
export function findEntryAnywhere(id: string, placeId?: string | null): { entry: Entry; city: City } | undefined {
  const byPlace = placeId ? CITIES.find((c) => c.places.some((p) => p.id === placeId)) : undefined;
  for (const city of byPlace ? [byPlace, ...CITIES] : CITIES) {
    const found = findEntry(city.id, id);
    if (found) return { entry: found, city };
  }
  return undefined;
}

export function placeNames(entry: Entry): string {
  return entry.places.map((p) => p.name).join(', ');
}

/** The row's second line: an icon names the activity it counts toward, an activity lists its places. */
export function entryHint(entry: Entry): string {
  if (entry.custom) return 'Added by you';
  if (entry.kind === 'icon') return `Counts toward: ${ACTIVITIES.get(entry.activityId)?.name ?? 'an activity'}`;
  return placeNames(entry) || otherWays(entry)[0]?.title || '';
}

export type Way = { kind: keyof Ways; icon: IconName; title: string; detail: string };

/** The ways to do an entry besides going to one of its places, in the order the card offers them. */
export function otherWays(entry: Entry): Way[] {
  const ways: (Way | false)[] = [
    !!entry.search && { kind: 'search', icon: 'search', title: 'Find one near you', detail: `Search maps for “${entry.search}”` },
    !!entry.home && { kind: 'home', icon: 'cottage', title: 'Try it at home', detail: entry.home },
    !!entry.host && { kind: 'host', icon: 'groups', title: 'Host friends', detail: entry.host },
  ];
  return ways.filter((w): w is Way => !!w);
}
