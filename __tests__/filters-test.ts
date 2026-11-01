import type { Entry } from '@/data/catalog';
import { accessibleEntry, describeFilters, matchesFilters, matchesFiltersAt, NO_FILTERS } from '@/data/filters';

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
    expect(matchesFilters(archery, filters, origin, { mode: 'drive', minutes: new Map([['range', 25]]) })).toBe(true);
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

  it('keeps only accessible places, or staying in, with the Accessible filter', () => {
    const filters = { ...NO_FILTERS, accessible: true };
    expect(matchesFilters(archery, filters, null)).toBe(false);

    const ramp = { id: 'ramp', name: 'Ramp Range', lat: 34.06, lng: -118.25, activities: [], wheelchair: 'yes' };
    const steps = { id: 'steps', name: 'Step Range', lat: 34.05, lng: -118.25, activities: [], wheelchair: 'no' };
    const both = { ...archery, places: [steps, ramp] } as Entry;
    expect(matchesFilters(both, filters, null)).toBe(true);
    expect(accessibleEntry(both)?.places.map((p) => p.id)).toEqual(['ramp']);
    // The drive filter counts only the accessible place, which is farther away.
    expect(matchesFilters(both, { ...filters, maxDrive: 15 }, origin, { mode: 'drive', minutes: new Map([['steps', 5], ['ramp', 20]]) })).toBe(false);

    const atHome = { ...archery, places: [], home: 'A kit' } as Entry;
    expect(matchesFilters(atHome, filters, null)).toBe(true);
    expect(describeFilters(filters, (id) => id)).toEqual(['Wheelchair accessible']);
  });

  it('checks travel time and access at one pin for the Map', () => {
    const near = { id: 'near', name: 'Near', lat: 34.06, lng: -118.25, activities: [], wheelchair: 'yes' } as unknown as Entry['places'][number];
    const far = archery.places[0];
    const both = { ...archery, places: [near, far] } as Entry;
    const drive = { ...NO_FILTERS, maxDrive: 30 };
    expect(matchesFiltersAt(both, near, drive, origin)).toBe(true);
    expect(matchesFiltersAt(both, far, drive, origin)).toBe(false);
    const access = { ...NO_FILTERS, accessible: true };
    expect(matchesFiltersAt(both, near, access, null)).toBe(true);
    expect(matchesFiltersAt({ ...both, home: 'At home' } as Entry, far, access, null)).toBe(false);
    // Stay in doesn't hide every pin.
    expect(matchesFiltersAt(both, far, { ...NO_FILTERS, where: 'home' }, null)).toBe(true);
    expect(matchesFiltersAt(both, far, { ...NO_FILTERS, maxCost: 0 }, null)).toBe(false);
  });
});
