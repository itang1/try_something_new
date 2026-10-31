import type { Entry } from '@/data/catalog';
import { describeFilters, matchesFilters, NO_FILTERS } from '@/data/filters';

const origin = { latitude: 34.05, longitude: -118.25 };
const archery = {
  subcategory: 'sport',
  level: 'medium',
  costLevel: 1,
  durationMinutes: 90,
  setting: 'outdoor',
  places: [{ id: 'range', name: 'Range', lat: 34.5, lng: -118.25, activities: [] }],
} as unknown as Entry;

describe('filters', () => {
  it('matches everything with no filters', () => {
    expect(matchesFilters(archery, NO_FILTERS, null)).toBe(true);
  });

  it('filters by cost, duration, level and setting', () => {
    expect(matchesFilters(archery, { ...NO_FILTERS, maxCost: 0 }, null)).toBe(false);
    expect(matchesFilters(archery, { ...NO_FILTERS, maxDuration: 60 }, null)).toBe(false);
    expect(matchesFilters(archery, { ...NO_FILTERS, levels: ['easy'] }, null)).toBe(false);
    expect(matchesFilters(archery, { ...NO_FILTERS, setting: 'indoor' }, null)).toBe(false);
    expect(matchesFilters(archery, { ...NO_FILTERS, setting: 'outdoor' }, null)).toBe(true);
  });

  it('applies the drive filter only once there is a starting point', () => {
    const filters = { ...NO_FILTERS, maxDrive: 30 };
    expect(matchesFilters(archery, filters, null)).toBe(true);
    expect(matchesFilters(archery, filters, origin)).toBe(false);
    expect(matchesFilters(archery, filters, origin, new Map([['range', 25]]))).toBe(true);
  });

  it('keeps ideas that work anywhere when going out, and inside any drive limit', () => {
    const pickleball = { ...archery, anywhere: { where: 'Any public court', detail: 'Paddles' } } as Entry;
    const filters = { ...NO_FILTERS, maxDrive: 30 };
    expect(matchesFilters(pickleball, filters, origin)).toBe(true);
    const anywhereOnly = { ...pickleball, places: [] } as Entry;
    expect(matchesFilters(anywhereOnly, { ...NO_FILTERS, where: 'out' }, null)).toBe(true);
    expect(matchesFilters(anywhereOnly, { ...NO_FILTERS, where: 'home' }, null)).toBe(false);
  });

  it('describes active filters', () => {
    const labels = describeFilters({ ...NO_FILTERS, levels: ['easy'], maxDrive: 30, maxCost: 0 }, (id) => id);
    expect(labels).toEqual(['Easy', 'Under 30 min away', 'Free']);
  });
});
