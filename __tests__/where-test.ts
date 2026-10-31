import type { Entry, Place } from '@/data/catalog';
import { CARD_PLACES, defaultWhere, whereOptions } from '@/data/where';

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
});
