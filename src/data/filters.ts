import { LEVELS, type Entry, type Level, type Setting } from './catalog';
import { driveMinutes, formatMinutes, type Coordinate, type DriveTimes } from './drive';
import type { IconName } from '@/icons/paths';

/** Going out to a place, or staying in alone or with friends. */
export type Where = 'out' | 'home';

/** Who's coming along. */
export type Company = 'solo' | 'together' | 'kids';

/** Explore's filters. Empty lists and nulls mean "any". */
export type Filters = {
  subcategories: string[];
  /** Missing from filters saved before it existed. */
  where?: Where | null;
  /** Missing from filters saved before these existed. */
  setting?: Setting | null;
  company?: Company | null;
  levels: Level[];
  maxDrive: number | null;
  maxCost: number | null;
  maxDuration: number | null;
};

export const NO_FILTERS: Filters = {
  subcategories: [],
  where: null,
  setting: null,
  company: null,
  levels: [],
  maxDrive: null,
  maxCost: null,
  maxDuration: null,
};

export const WHERE_OPTIONS: { where: Where; label: string; icon: IconName }[] = [
  { where: 'out', label: 'Go out', icon: 'location_on' },
  { where: 'home', label: 'Stay in', icon: 'cottage' },
];

export function matchesWhere(entry: Entry, where: Where): boolean {
  return where === 'out' ? entry.places.length > 0 || !!entry.search : !!entry.home || !!entry.host;
}

export const SETTING_OPTIONS: { setting: Setting; label: string; icon: IconName }[] = [
  { setting: 'indoor', label: 'Indoors', icon: 'house' },
  { setting: 'outdoor', label: 'Outdoors', icon: 'park' },
];

export const COMPANY_OPTIONS: { company: Company; label: string; icon: IconName }[] = [
  { company: 'solo', label: 'On my own', icon: 'person' },
  { company: 'together', label: 'With others', icon: 'groups' },
  { company: 'kids', label: 'With kids', icon: 'family_restroom' },
];

function matchesCompany(entry: Entry, company: Company): boolean {
  if (company === 'kids') return !!entry.kids;
  return company === 'together' ? !!entry.together : !entry.together;
}

export const DRIVE_OPTIONS = [15, 30, 60];
export const COST_OPTIONS: { level: number; label: string }[] = [
  { level: 0, label: 'Free' },
  { level: 1, label: 'Up to $' },
  { level: 2, label: 'Up to $$' },
];
export const DURATION_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 60, label: 'An hour' },
  { minutes: 150, label: 'A few hours' },
  { minutes: 240, label: 'Half a day' },
];

export function matchesFilters(
  entry: Entry,
  filters: Filters,
  origin: Coordinate | null,
  times?: DriveTimes,
): boolean {
  if (filters.subcategories.length && !filters.subcategories.includes(entry.subcategory)) return false;
  if (filters.where && !matchesWhere(entry, filters.where)) return false;
  if (filters.setting && entry.setting && entry.setting !== filters.setting) return false;
  if (filters.company && !matchesCompany(entry, filters.company)) return false;
  if (filters.levels.length && !filters.levels.includes(entry.level)) return false;
  if (filters.maxCost != null && entry.costLevel > filters.maxCost) return false;
  if (filters.maxDuration != null && entry.durationMinutes > filters.maxDuration) return false;
  // Without a starting point there are no drive times, so the drive filter waits until there is one.
  const minutes = driveMinutes(entry, origin, times);
  if (filters.maxDrive != null && minutes != null && minutes > filters.maxDrive) return false;
  return true;
}

/** Short labels for the active filters, like "Easy" or "Under 30 min away". */
export function describeFilters(filters: Filters, subcategoryLabel: (id: string) => string): string[] {
  return [
    ...filters.subcategories.map(subcategoryLabel),
    filters.where && WHERE_OPTIONS.find((w) => w.where === filters.where)?.label,
    filters.setting && SETTING_OPTIONS.find((s) => s.setting === filters.setting)?.label,
    filters.company && COMPANY_OPTIONS.find((c) => c.company === filters.company)?.label,
    ...filters.levels.map((l) => LEVELS[l].label),
    filters.maxDrive != null && `Under ${formatMinutes(filters.maxDrive)} away`,
    filters.maxCost != null && COST_OPTIONS.find((c) => c.level === filters.maxCost)?.label,
    filters.maxDuration != null && DURATION_OPTIONS.find((d) => d.minutes === filters.maxDuration)?.label,
  ].filter((x): x is string => !!x);
}
