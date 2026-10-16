import raw from '../../TrySomethingNew/activities.json';
import iconMapping from '../../design/icon-mapping.json';
import type { IconName } from '@/icons/paths';

export type Venue = { id: string; name: string; lat: number; lng: number };

export type City = { id: string; name: string; icon: IconName };

export type Activity = {
  id: string;
  name: string;
  icon: IconName;
  subcategory: string;
  duration: string;
  cost: string;
  /** City name, or "Anywhere". */
  city: string;
  /** Venues keyed by city name. */
  venues: Record<string, Venue[]>;
  /** Venue names keyed by city name, for activities with explicit location hints. */
  hints: Record<string, string>;
  durationMinutes: number;
  costLevel: number;
};

type RawLocation = { id?: string; name: string; lat?: number; lng?: number };
type RawActivity = {
  id: string;
  name: string;
  cityId: string;
  subcategory: string;
  duration: string;
  cost: string;
  lat?: number;
  lng?: number;
  locationHints?: Record<string, { locations: RawLocation[] }>;
};

const CITY_ICONS: Record<string, IconName> = { 'los-angeles': 'sunny', columbus: 'eco' };

export const CITIES: City[] = raw.cities
  .filter((c) => c.id !== 'anywhere')
  .map((c) => ({ id: c.id, name: c.name, icon: CITY_ICONS[c.id] ?? 'location_city' }));

const cityNameById = Object.fromEntries(raw.cities.map((c) => [c.id, c.name]));
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

function toActivity(a: RawActivity): Activity {
  const city = cityNameById[a.cityId] ?? 'Anywhere';
  const venues: Record<string, Venue[]> = {};
  const hints: Record<string, string> = {};
  if (a.locationHints) {
    for (const [cityId, group] of Object.entries(a.locationHints)) {
      hints[cityNameById[cityId] ?? cityId] = group.locations.map((l) => l.name).join(', ');
      venues[cityNameById[cityId] ?? cityId] = group.locations
        .filter((l): l is Required<RawLocation> => l.lat != null && l.lng != null && l.id != null)
        .map(({ id, name, lat, lng }) => ({ id, name, lat, lng }));
    }
  } else if (a.lat != null && a.lng != null) {
    venues[city] = [{ id: a.id, name: a.name, lat: a.lat, lng: a.lng }];
  }
  return {
    id: a.id,
    name: a.name,
    icon: icons[a.id].material as IconName,
    subcategory: a.subcategory,
    duration: a.duration,
    cost: a.cost,
    city,
    venues,
    hints,
    durationMinutes: DURATION_MINUTES[a.duration] ?? 0,
    costLevel: COST_LEVEL[a.cost] ?? 0,
  };
}

export const ACTIVITIES: Activity[] = (raw.activities as RawActivity[])
  .map(toActivity)
  .sort((a, b) => a.name.localeCompare(b.name));

export function activitiesForCity(cityName: string): Activity[] {
  return ACTIVITIES.filter((a) => a.city === cityName || a.city === 'Anywhere');
}
