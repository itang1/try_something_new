import type { Entry, Place } from '@/data/catalog';
import { CARD_PLACES, defaultWhere, planSpot, whereOptions } from '@/data/where';

const place = (id: string): Place => ({ id, name: id, lat: 0, lng: 0, activities: [] });
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ place: place(`p${i}`), minutes: (i + 1) * 5 }));
const pottery = { kind: 'activity', activityId: 'pottery', home: 'A mug and paint pens', search: 'pottery studio' } as Entry;

describe('whereOptions', () => {
  it('lists home, the closest places, then a maps search', () => {
    const options = whereOptions(pottery, rows(6));
    expect(options.map((o) => o.id)).toEqual(['home:pottery', 'p0', 'p1', 'p2', 'p3', 'search']);
    expect(options.filter((o) => o.kind === 'place')).toHaveLength(CARD_PLACES);
    expect(options[1].detail).toBe('5 min away');
  });

  it('keeps a farther place that was picked', () => {
    expect(whereOptions(pottery, rows(8), 'p6').map((o) => o.id)).toContain('p6');
  });

  it('ends with hosting friends when the entry can be hosted', () => {
    const bread = { kind: 'activity', activityId: 'bake-bread', home: 'Flour and yeast', host: 'Bake together' } as Entry;
    const options = whereOptions(bread, rows(1));
    expect(options.map((o) => o.id)).toEqual(['home:bake-bread', 'p0', 'host']);
    expect(options[2]).toMatchObject({ kind: 'host', title: 'Host friends', detail: 'Bake together' });
  });

  it('skips home and search when the entry has neither', () => {
    expect(whereOptions({ kind: 'activity', activityId: 'bowling' } as Entry, rows(1)).map((o) => o.id)).toEqual(['p0']);
  });
});

describe('defaultWhere', () => {
  it('starts at the closest place, or home when staying in', () => {
    const options = whereOptions(pottery, rows(2));
    expect(defaultWhere(options, false)?.id).toBe('p0');
    expect(defaultWhere(options, true)?.id).toBe('home:pottery');
  });

  it('falls back to a search, then home', () => {
    expect(defaultWhere(whereOptions(pottery, []), false)?.kind).toBe('search');
    expect(defaultWhere(whereOptions({ ...pottery, search: undefined }, []), false)?.kind).toBe('home');
    expect(defaultWhere([], false)).toBeUndefined();
  });

  it('shows hosting when there is nothing else', () => {
    const potluck = { kind: 'activity', activityId: 'potluck', host: 'Everyone brings a dish' } as Entry;
    expect(defaultWhere(whereOptions(potluck, []), true)?.kind).toBe('host');
  });
});

describe('planSpot', () => {
  const bread = { ...pottery, host: 'Bake together' } as Entry;
  const options = whereOptions(bread, rows(1));
  const pick = (id: string) => planSpot(options.find((o) => o.id === id), options);

  it('starts the plan at the place or home on the card', () => {
    expect(pick('p0')).toBe('p0');
    expect(pick('home:pottery')).toBe('home:pottery');
  });

  it('plans hosting at home, and leaves a search or host-only idea open', () => {
    expect(pick('host')).toBe('home:pottery');
    expect(pick('search')).toBeNull();
    const potluck = whereOptions({ kind: 'activity', activityId: 'potluck', host: 'Bring a dish' } as Entry, []);
    expect(planSpot(potluck[0], potluck)).toBeNull();
  });
});
