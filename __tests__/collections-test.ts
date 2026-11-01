import activitiesFile from '../data/activities.json';
import type { Entry } from '@/data/catalog';
import { COLLECTIONS, DATE_IDEAS, inCollection } from '@/data/collections';
import { describeFilters, matchesFilters, NO_FILTERS } from '@/data/filters';

const entry = (fields: Partial<Entry>) =>
  ({ activityId: 'x', subcategory: 'play', level: 'easy', costLevel: 1, durationMinutes: 90, places: [], ...fields }) as Entry;

describe('collections', () => {
  it('only lists date ideas that are in the catalog', () => {
    const ids = new Set(activitiesFile.activities.map((a) => a.id));
    expect([...DATE_IDEAS].filter((id) => !ids.has(id))).toEqual([]);
  });

  it('has something in every collection', () => {
    const entries = activitiesFile.activities.map((a) =>
      entry({ ...(a as Partial<Entry>), activityId: a.id, costLevel: { Free: 0, $: 1, $$: 2, $$$: 3 }[a.cost] }),
    );
    for (const c of COLLECTIONS) expect(entries.filter((e) => inCollection(e, c.id)).length).toBeGreaterThan(5);
  });

  it('counts a city icon as a date idea through its activity', () => {
    expect(inCollection(entry({ id: 'griffith', activityId: 'stargazing' }), 'date')).toBe(true);
    expect(inCollection(entry({ activityId: 'potluck' }), 'date')).toBe(false);
  });

  it('keeps indoor, either-way and at-home ideas for a rainy day', () => {
    expect(inCollection(entry({ setting: 'indoor' }), 'rainy')).toBe(true);
    expect(inCollection(entry({}), 'rainy')).toBe(true);
    expect(inCollection(entry({ setting: 'outdoor' }), 'rainy')).toBe(false);
    expect(inCollection(entry({ setting: 'outdoor', home: 'A telescope app' }), 'rainy')).toBe(true);
  });

  it('sorts by cost and kids', () => {
    expect(inCollection(entry({ costLevel: 0 }), 'free')).toBe(true);
    expect(inCollection(entry({ costLevel: 1 }), 'free')).toBe(false);
    expect(inCollection(entry({ costLevel: 1 }), 'cheap')).toBe(true);
    expect(inCollection(entry({ costLevel: 2 }), 'cheap')).toBe(false);
    expect(inCollection(entry({ kids: true }), 'kids')).toBe(true);
    expect(inCollection(entry({}), 'kids')).toBe(false);
  });

  it('works as a filter alongside the others', () => {
    const filters = { ...NO_FILTERS, collection: 'free' as const };
    expect(matchesFilters(entry({ costLevel: 0 }), filters, null)).toBe(true);
    expect(matchesFilters(entry({ costLevel: 2 }), filters, null)).toBe(false);
    expect(describeFilters(filters, (id) => id)).toEqual(['Free this weekend']);
    // Filters saved before collections existed have no collection field.
    const { collection: _, ...old } = NO_FILTERS;
    expect(matchesFilters(entry({ costLevel: 3 }), old, null)).toBe(true);
  });
});
