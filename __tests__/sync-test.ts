import { fromServer, sync, toServer, type Remote } from '@/data/sync';
import { applyChanges, changesSince } from '@/data/storage';

const mockSettings = new Map<string, unknown>();
jest.mock('@/data/storage', () => ({
  changesSince: jest.fn(),
  applyChanges: jest.fn(),
  readSetting: (key: string, fallback: unknown) => (mockSettings.has(key) ? mockSettings.get(key) : fallback),
  writeSetting: (key: string, value: unknown) => mockSettings.set(key, JSON.parse(JSON.stringify(value))),
}));

const empty = { completion_events: [], place_visits: [], reflections: [], plans: [], custom_activities: [], list_events: [] };

function fakeRemote(server: Record<string, Record<string, unknown>[]>): Remote & { pushed: Record<string, unknown[]> } {
  const pushed: Record<string, unknown[]> = {};
  return {
    pushed,
    async push(table, rows) {
      (pushed[table] ??= []).push(...rows);
    },
    async pull(table, after, limit) {
      const key = (r: Record<string, unknown>) => `${r.updated_at}|${r.id}`;
      return (server[table] ?? [])
        .filter((r) => !after || key(r) > `${after.updatedAt}|${after.id}`)
        .sort((a, b) => (key(a) < key(b) ? -1 : 1))
        .slice(0, limit);
    },
  };
}

beforeEach(() => {
  mockSettings.clear();
  jest.mocked(changesSince).mockReset();
  jest.mocked(applyChanges).mockReset().mockImplementation((c) => Object.values(c).flat().length);
});

describe('row conversion', () => {
  it('sends real booleans and no local photo', () => {
    expect(toServer({ id: 'a', done: 1, earlier: 0, photo: 'local.jpg' })).toEqual({ id: 'a', done: true, earlier: false, photo: null });
  });

  it('stores server rows the way the phone writes them', () => {
    expect(
      fromServer({ owner_id: 'u', updated_at: 'x', id: 'a', added: true, at: '2026-10-31T16:00:00.5+00:00' }),
    ).toEqual({ id: 'a', added: 1, at: '2026-10-31T16:00:00.500Z' });
  });
});

describe('sync', () => {
  it('pushes new rows and saves the push cursor', async () => {
    jest.mocked(changesSince).mockReturnValue({
      changes: { ...empty, list_events: [{ id: 'l1', added: 1, at: '2026-10-31T00:00:00.000Z' }] },
      cursor: { list_events: 7 },
    });
    const remote = fakeRemote({});
    const result = await sync(remote);
    expect(result).toEqual({ pushed: 1, pulled: 0 });
    expect(remote.pushed.list_events).toEqual([{ id: 'l1', added: true, at: '2026-10-31T00:00:00.000Z' }]);
    expect(mockSettings.get('syncPushCursor')).toEqual({ list_events: 7 });
  });

  it('keeps the push cursor when a push fails', async () => {
    mockSettings.set('syncPushCursor', { list_events: 3 });
    jest.mocked(changesSince).mockReturnValue({
      changes: { ...empty, list_events: [{ id: 'l1', added: 1 }] },
      cursor: { list_events: 9 },
    });
    const remote = fakeRemote({});
    remote.push = async () => {
      throw new Error('offline');
    };
    await expect(sync(remote)).rejects.toThrow('offline');
    expect(mockSettings.get('syncPushCursor')).toEqual({ list_events: 3 });
  });

  it('pulls every page and remembers where it stopped', async () => {
    jest.mocked(changesSince).mockReturnValue({ changes: empty, cursor: {} });
    // More rows than a page, all written in one transaction so they share a time.
    const rows = Array.from({ length: 1203 }, (_, i) => ({
      id: `id-${String(i).padStart(5, '0')}`,
      done: true,
      earlier: false,
      activity_id: 'a',
      at: '2026-10-31T16:00:00Z',
      updated_at: '2026-10-31T16:00:01.000Z',
    }));
    const result = await sync(fakeRemote({ completion_events: rows }));
    expect(result.pulled).toBe(1203);
    expect(applyChanges).toHaveBeenCalledTimes(3);
    expect(mockSettings.get('syncPullMarks')).toEqual({ completion_events: { updatedAt: '2026-10-31T16:00:01.000Z', id: 'id-01202' } });
  });
});
