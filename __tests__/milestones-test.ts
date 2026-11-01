import { lastMonthRecap, milestones, milestonesToShow, yearRecap } from '@/data/milestones';

type Item = Parameters<typeof milestones>[0][number] & { at: string; entry: { name: string; subcategory: string } };
const item = (n: number, fields: Partial<{ kind: string; rating: 'loved' | 'fine' | null; city: string; placeId: string; photo: string; at: string }> = {}) =>
  ({
    entry: { id: `idea-${n}`, name: `Idea ${n}`, icon: 'star', subcategory: fields.kind ?? 'make' },
    city: { id: fields.city ?? 'seattle' },
    rating: fields.rating ?? null,
    placeId: fields.placeId ?? null,
    photo: fields.photo ?? null,
    at: fields.at ?? '2026-10-10T18:00:00.000Z',
  }) as unknown as Item;

describe('milestones', () => {
  it('earns counts that only go up', () => {
    const items = [1, 2, 3, 4, 5].map((n) => item(n, { rating: 'loved' }));
    const { earned, next } = milestonesToShow(milestones(items));
    expect(earned.map((m) => m.id)).toEqual(['first', 'five', 'loved-five']);
    expect(next?.id).toBe('ten');
    expect(next?.progress).toBe(5);
  });

  it('counts kinds, cities, home and photos', () => {
    const kinds = ['move', 'outdoors', 'water', 'make', 'food', 'learn', 'explore', 'shows', 'play'];
    const items = kinds.map((kind, n) => item(n, { kind, city: n ? 'seattle' : 'seoul', placeId: n < 3 ? `home:x${n}` : 'osm:1' }));
    const ids = milestonesToShow(milestones(items)).earned.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(['all-kinds', 'cities', 'home']));
    expect(ids).not.toContain('photos');
  });

  it('shows nothing earned with no memories, and points to the first', () => {
    expect(milestonesToShow(milestones([]))).toEqual({ earned: [], next: expect.objectContaining({ id: 'first' }) });
  });
});

describe('monthly recap', () => {
  const items = [
    item(1, { at: '2026-10-03T18:00:00', rating: 'loved', kind: 'food' }),
    item(2, { at: '2026-10-20T18:00:00', kind: 'make' }),
    item(3, { at: '2026-09-20T18:00:00' }),
  ];

  it('sums up last month in the first week of the next', () => {
    expect(lastMonthRecap(items, new Date(2026, 10, 2))).toEqual({
      label: 'October',
      tried: 2,
      kinds: 2,
      loved: 1,
      favorite: 'Idea 1',
      picks: [
        { id: 'idea-1', name: 'Idea 1', icon: 'star', subcategory: 'food', loved: true },
        { id: 'idea-2', name: 'Idea 2', icon: 'star', subcategory: 'make', loved: false },
      ],
    });
  });

  it('stays quiet later in the month, or after a month with nothing', () => {
    expect(lastMonthRecap(items, new Date(2026, 10, 12))).toBeNull();
    expect(lastMonthRecap(items, new Date(2026, 11, 3))).toBeNull();
  });
});

describe('year in review', () => {
  const items = [
    item(1, { at: '2026-03-03T18:00:00', rating: 'loved', kind: 'food' }),
    item(2, { at: '2026-12-02T18:00:00', kind: 'make' }),
    item(3, { at: '2025-12-20T18:00:00' }),
  ];

  it('covers the year so far in December, and the year just gone in early January', () => {
    expect(yearRecap(items, new Date(2026, 11, 10))).toMatchObject({ label: '2026', tried: 2, kinds: 2, loved: 1, favorite: 'Idea 1' });
    expect(yearRecap(items, new Date(2027, 0, 5))).toMatchObject({ label: '2026', tried: 2 });
    expect(yearRecap(items, new Date(2026, 0, 3))).toMatchObject({ label: '2025', tried: 1 });
  });

  it('stays quiet the rest of the year', () => {
    expect(yearRecap(items, new Date(2026, 10, 2))).toBeNull();
    expect(yearRecap(items, new Date(2027, 0, 8))).toBeNull();
    expect(yearRecap([], new Date(2026, 11, 10))).toBeNull();
  });
});
