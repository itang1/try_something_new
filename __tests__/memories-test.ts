import type { City, Entry } from '@/data/catalog';
import { memoryItems, triedNumber } from '@/data/memories';
import type { Memory } from '@/data/storage';

const city = (id: string) => ({ id, name: id, places: [{ id: `${id}-park`, name: 'The Park' }] }) as unknown as City;
const seattle = city('seattle');
const la = city('la');

const entries: Record<string, { entry: Entry; city: City }> = {
  hike: { entry: { id: 'hike', kind: 'activity' } as Entry, city: seattle },
  pottery: { entry: { id: 'pottery', kind: 'activity' } as Entry, city: seattle },
  needle: { entry: { id: 'needle', kind: 'icon', activityId: 'hike' } as Entry, city: seattle },
  surf: { entry: { id: 'surf', kind: 'activity' } as Entry, city: la },
};
const find = (id: string) => entries[id];

const memory = (entryId: string, at: string, extra: Partial<Memory> = {}): Memory => ({
  entryId,
  at,
  placeId: null,
  placeName: null,
  rating: null,
  note: null,
  photo: null,
  ...extra,
});

describe('memoryItems', () => {
  it('drops the activity a city icon checked off at the same moment', () => {
    const items = memoryItems(
      [memory('needle', '2026-10-02T10:00:00.000Z'), memory('hike', '2026-10-02T10:00:01.000Z')],
      find,
    );
    expect(items.map((i) => i.entry.id)).toEqual(['needle']);
  });

  it('keeps that activity when it has its own reflection', () => {
    const items = memoryItems(
      [memory('needle', '2026-10-02T10:00:00.000Z'), memory('hike', '2026-10-02T10:00:01.000Z', { rating: 'loved' })],
      find,
    );
    expect(items).toHaveLength(2);
  });

  it('names the place from the catalog, and skips entries it can no longer find', () => {
    const items = memoryItems(
      [memory('hike', '2026-10-01T10:00:00.000Z', { placeId: 'seattle-park', placeName: 'Old name' }), memory('gone', '2026-10-01T10:00:00.000Z')],
      find,
    );
    expect(items.map((i) => [i.entry.id, i.placeName])).toEqual([['hike', 'The Park']]);
  });
});

describe('triedNumber', () => {
  const items = memoryItems(
    [
      memory('pottery', '2026-10-20T10:00:00.000Z'),
      memory('surf', '2026-10-10T10:00:00.000Z'),
      memory('hike', '2026-10-05T10:00:00.000Z'),
    ],
    find,
  );
  const item = (id: string) => items.find((i) => i.entry.id === id)!;

  it('counts things tried in the same city up to and including this one', () => {
    expect(triedNumber(items, item('hike'))).toBe(1);
    expect(triedNumber(items, item('pottery'))).toBe(2);
  });

  it('counts each city on its own', () => {
    expect(triedNumber(items, item('surf'))).toBe(1);
  });
});
