import { LEVELS, type Entry, type Level } from './catalog';
import { driveMinutes, formatMinutes, type Coordinate, type DriveTimes } from './drive';

/** Explore's filters. Empty lists and nulls mean "any". */
export type Filters = {
  subcategories: string[];
  levels: Level[];
  maxDrive: number | null;
  maxCost: number | null;
  maxDuration: number | null;
};

export const NO_FILTERS: Filters = { subcategories: [], levels: [], maxDrive: null, maxCost: null, maxDuration: null };

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
    ...filters.levels.map((l) => LEVELS[l].label),
    filters.maxDrive != null && `Under ${formatMinutes(filters.maxDrive)} away`,
    filters.maxCost != null && COST_OPTIONS.find((c) => c.level === filters.maxCost)?.label,
    filters.maxDuration != null && DURATION_OPTIONS.find((d) => d.minutes === filters.maxDuration)?.label,
  ].filter((x): x is string => !!x);
}
