/// <reference types="node" />
// The storage module migrates the phone's SQLite database when it loads. These tests run it against
// a real in-memory SQLite (Node's built-in one) seeded the way an older version of the app left it,
// so a migration that drops or garbles someone's history fails here instead of on their phone.
import { DatabaseSync } from 'node:sqlite';

type Value = string | number | null;
type Fake = { db: DatabaseSync; kv: Map<string, string> };

declare global {
  var fakeStorage: Fake;
}

// Just the part of expo-sqlite's synchronous API that storage.ts uses.
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => {
    const { db } = globalThis.fakeStorage;
    const plain = <T>(row: unknown) => (row ? ({ ...(row as object) } as T) : null);
    return {
      execSync: (sql: string) => db.exec(sql),
      runSync: (sql: string, params: Value[] = []) => {
        const { changes } = db.prepare(sql).run(...params);
        return { changes: Number(changes) };
      },
      getFirstSync: <T>(sql: string, params: Value[] = []) => plain<T>(db.prepare(sql).get(...params)),
      getAllSync: <T>(sql: string, params: Value[] = []) => db.prepare(sql).all(...params).map((r) => plain<T>(r)!),
      withTransactionSync: (task: () => void) => {
        db.exec('BEGIN');
        try {
          task();
          db.exec('COMMIT');
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
    };
  },
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (key: string) => globalThis.fakeStorage.kv.get(key) ?? null,
    setItemSync: (key: string, value: string) => void globalThis.fakeStorage.kv.set(key, value),
  },
}));

type Storage = typeof import('@/data/storage');

// The tables as the first version of the app made them, before any migration added a column.
const VERSION_0_SCHEMA = `
  CREATE TABLE completion_events (id INTEGER PRIMARY KEY AUTOINCREMENT, activity_id TEXT NOT NULL, done INTEGER NOT NULL, at TEXT NOT NULL);
  CREATE TABLE place_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, place_id TEXT NOT NULL, activity_id TEXT NOT NULL, visited INTEGER NOT NULL, at TEXT NOT NULL);
  CREATE TABLE reflections (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id TEXT NOT NULL, place_id TEXT, rating TEXT, note TEXT, photo TEXT, at TEXT NOT NULL);
  CREATE TABLE custom_activities (id TEXT PRIMARY KEY, city_id TEXT NOT NULL, name TEXT NOT NULL, subcategory TEXT NOT NULL, duration TEXT NOT NULL, cost TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL);
  CREATE TABLE plans (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id TEXT NOT NULL, city_id TEXT NOT NULL, place_id TEXT, day TEXT, at TEXT NOT NULL);
  CREATE TABLE drive_times (origin TEXT NOT NULL, place_id TEXT NOT NULL, minutes INTEGER, at TEXT NOT NULL, PRIMARY KEY (origin, place_id));
  CREATE TABLE catalog_cities (id TEXT PRIMARY KEY, hash TEXT NOT NULL, json TEXT NOT NULL, at TEXT NOT NULL);
`;

const LATEST_VERSION = 6;

/** Loads storage.ts against a database, the way the app does on launch. */
function launch(fake: Fake): Storage {
  globalThis.fakeStorage = fake;
  let storage!: Storage;
  jest.isolateModules(() => {
    storage = require('@/data/storage');
  });
  return storage;
}

function newPhone(): Fake {
  return { db: new DatabaseSync(':memory:'), kv: new Map() };
}

/** A phone last opened by a version of the app at the given schema version. */
function oldPhone(version: number, seed: (db: DatabaseSync, kv: Map<string, string>) => void): Fake {
  const fake = newPhone();
  fake.db.exec(VERSION_0_SCHEMA);
  if (version >= 3) fake.db.exec('ALTER TABLE reflections ADD COLUMN place_name TEXT; ALTER TABLE plans ADD COLUMN place_name TEXT;');
  if (version >= 4) fake.db.exec('ALTER TABLE completion_events ADD COLUMN earlier INTEGER NOT NULL DEFAULT 0;');
  seed(fake.db, fake.kv);
  fake.db.exec(`PRAGMA user_version = ${version}`);
  return fake;
}

const insert = (db: DatabaseSync, table: string, row: Record<string, Value>) => {
  const columns = Object.keys(row);
  db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`).run(...Object.values(row));
};

const all = (db: DatabaseSync, sql: string) => db.prepare(sql).all().map((r) => ({ ...r }));
const column = (db: DatabaseSync, sql: string) => db.prepare(sql).all().map((r) => Object.values(r)[0]);
const version = (db: DatabaseSync) => db.prepare('PRAGMA user_version').get()!.user_version;
const count = (db: DatabaseSync, table: string) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()!.n;
const setting = (kv: Map<string, string>, key: string) => JSON.parse(kv.get(key) ?? 'null');

const custom = (id: string, subcategory: string) => ({
  id,
  city_id: 'columbus',
  name: id,
  subcategory,
  duration: 'hour',
  cost: 'free',
  at: '2025-01-01T00:00:00.000Z',
});

/** A phone from the first version of the app, with something every migration has to move. */
function firstVersionPhone(): Fake {
  return oldPhone(0, (db, kv) => {
    // Version 1 renamed kinds. Version 6 turned calm and social into filters.
    for (const [id, kind] of [
      ['c-outdoor', 'outdoor'],
      ['c-museum', 'museum'],
      ['c-craft', 'craft'],
      ['c-calm', 'calm'],
      ['c-social', 'social'],
      ['c-food', 'food'],
    ]) {
      insert(db, 'custom_activities', custom(id, kind));
    }
    kv.set('exploreFilters', JSON.stringify({ subcategories: ['outdoor', 'museum', 'shopping', 'calm', 'social', 'food'], free: true }));
    // Version 2 merged skiing and snowboarding, and folded Korean BBQ into new cuisines.
    insert(db, 'completion_events', { activity_id: 'skiing', done: 1, at: '2025-01-02T00:00:00.000Z' });
    insert(db, 'completion_events', { activity_id: 'korean-bbq', done: 1, at: '2025-01-03T00:00:00.000Z' });
    insert(db, 'completion_events', { activity_id: 'pottery', done: 1, at: '2025-01-04T00:00:00.000Z' });
    insert(db, 'completion_events', { activity_id: 'pottery', done: 0, at: '2025-01-05T00:00:00.000Z' });
    // Version 5 took the city out of place ids.
    insert(db, 'place_visits', { place_id: 'columbus--osm-n42', activity_id: 'snowboarding', visited: 1, at: '2025-01-02T00:00:00.000Z' });
    insert(db, 'place_visits', { place_id: 'columbus--art-museum', activity_id: 'museums', visited: 1, at: '2025-01-03T00:00:00.000Z' });
    insert(db, 'reflections', {
      entry_id: 'skiing',
      place_id: 'columbus--osm-n42',
      rating: 'loved',
      note: 'Fell twice',
      photo: 'file:///photo.jpg',
      at: '2025-01-02T01:00:00.000Z',
    });
    insert(db, 'reflections', { entry_id: 'korean-bbq', place_id: null, rating: 'fine', note: null, photo: null, at: '2025-01-03T01:00:00.000Z' });
    insert(db, 'plans', { entry_id: 'korean-bbq', city_id: 'columbus', place_id: 'columbus--osm-w7', day: '2025-02-01', at: '2025-01-03T00:00:00.000Z' });
    insert(db, 'plans', { entry_id: 'museums', city_id: 'columbus', place_id: null, day: '2025-02-02', at: '2025-01-03T00:00:00.000Z' });
    insert(db, 'drive_times', { origin: '39.96,-83.00', place_id: 'columbus--osm-n42', minutes: 25, at: '2025-01-01T00:00:00.000Z' });
    insert(db, 'catalog_cities', { id: 'columbus', hash: 'abc', json: '{}', at: '2025-01-01T00:00:00.000Z' });
    kv.set('savedIds', JSON.stringify(['skiing', 'snowboarding', 'pottery']));
    kv.set('hiddenIds', JSON.stringify(['korean-bbq']));
  });
}

describe('storage migrations', () => {
  it('sets up a new phone at the latest version', () => {
    const phone = newPhone();
    const storage = launch(phone);
    expect(version(phone.db)).toBe(LATEST_VERSION);

    storage.recordCompletion('pottery', true);
    storage.recordCompletion('bowling', true, true);
    storage.recordReflection({ entryId: 'pottery', placeId: 'osm:n1', placeName: 'Clay Studio', rating: 'loved', note: '', photo: null });
    storage.recordPlan('columbus', 'hiking', { placeId: null, placeName: null, day: '2026-11-07' });

    expect(storage.loadDoneIds()).toEqual(new Set(['pottery', 'bowling']));
    expect(storage.loadMemories()).toEqual([
      expect.objectContaining({ entryId: 'pottery', placeId: 'osm:n1', placeName: 'Clay Studio', rating: 'loved', note: null }),
    ]);
    expect([...storage.loadPlans().keys()]).toEqual(['columbus/hiking']);
  });

  it('upgrades a phone from the first version without losing a row', () => {
    const phone = firstVersionPhone();
    const tables = ['completion_events', 'place_visits', 'reflections', 'plans', 'custom_activities', 'catalog_cities'];
    const before = tables.map((t) => count(phone.db, t));

    launch(phone);

    expect(version(phone.db)).toBe(LATEST_VERSION);
    expect(tables.map((t) => count(phone.db, t))).toEqual(before);
  });

  it('renames kinds on custom activities and in the Explore filters (versions 1 and 6)', () => {
    const phone = firstVersionPhone();
    launch(phone);

    expect(all(phone.db, 'SELECT id, subcategory FROM custom_activities ORDER BY id')).toEqual([
      { id: 'c-calm', subcategory: 'outdoors' },
      { id: 'c-craft', subcategory: 'make' },
      { id: 'c-food', subcategory: 'food' },
      { id: 'c-museum', subcategory: 'explore' },
      { id: 'c-outdoor', subcategory: 'move' },
      { id: 'c-social', subcategory: 'play' },
    ]);
    // Merged kinds appear once, and the rest of the filters are kept.
    expect(setting(phone.kv, 'exploreFilters')).toEqual({ subcategories: ['move', 'explore', 'outdoors', 'play', 'food'], free: true });
  });

  it('moves history and lists onto renamed activities (version 2)', () => {
    const phone = firstVersionPhone();
    const storage = launch(phone);

    expect(column(phone.db, 'SELECT activity_id FROM completion_events ORDER BY id')).toEqual([
      'snow-sports',
      'new-cuisine',
      'pottery',
      'pottery',
    ]);
    expect(column(phone.db, 'SELECT activity_id FROM place_visits ORDER BY id')).toEqual(['snow-sports', 'museums']);
    expect(column(phone.db, 'SELECT entry_id FROM reflections ORDER BY id')).toEqual(['snow-sports', 'new-cuisine']);
    expect(column(phone.db, 'SELECT entry_id FROM plans ORDER BY id')).toEqual(['new-cuisine', 'museums']);
    // Skiing and snowboarding were both saved, and are now one saved idea.
    expect(setting(phone.kv, 'savedIds')).toEqual(['snow-sports', 'pottery']);
    expect(setting(phone.kv, 'hiddenIds')).toEqual(['new-cuisine']);
    // Undoing still wins: pottery was done, then undone.
    expect(storage.loadDoneIds()).toEqual(new Set(['snow-sports', 'new-cuisine']));
  });

  it('adds place names and "done earlier" to existing rows without changing them (versions 3 and 4)', () => {
    const phone = firstVersionPhone();
    const storage = launch(phone);

    expect(column(phone.db, 'SELECT place_name FROM reflections')).toEqual([null, null]);
    expect(column(phone.db, 'SELECT place_name FROM plans')).toEqual([null, null]);
    expect(column(phone.db, 'SELECT earlier FROM completion_events')).toEqual([0, 0, 0, 0]);
    // Old completions were real outings, so they stay memories, newest first, with their notes and photos.
    expect(storage.loadMemories()).toEqual([
      { entryId: 'new-cuisine', at: '2025-01-03T00:00:00.000Z', placeId: null, placeName: null, rating: 'fine', note: null, photo: null },
      {
        entryId: 'snow-sports',
        at: '2025-01-02T00:00:00.000Z',
        placeId: 'osm:n42',
        placeName: null,
        rating: 'loved',
        note: 'Fell twice',
        photo: 'file:///photo.jpg',
      },
    ]);
  });

  it('takes the city out of place ids and clears cached drive times (version 5)', () => {
    const phone = firstVersionPhone();
    const storage = launch(phone);

    expect(column(phone.db, 'SELECT place_id FROM place_visits ORDER BY id')).toEqual(['osm:n42', 'pick:art-museum']);
    expect(column(phone.db, 'SELECT place_id FROM reflections ORDER BY id')).toEqual(['osm:n42', null]);
    expect(column(phone.db, 'SELECT place_id FROM plans ORDER BY id')).toEqual(['osm:w7', null]);
    expect(count(phone.db, 'drive_times')).toBe(0);
    expect(storage.loadVisitedPlaceIds()).toEqual(new Set(['osm:n42', 'pick:art-museum']));
    expect(storage.loadPlans().get('columbus/new-cuisine')).toEqual({
      entryId: 'new-cuisine',
      cityId: 'columbus',
      placeId: 'osm:w7',
      placeName: null,
      day: '2025-02-01',
    });
  });

  it('runs only the steps a phone has not had yet', () => {
    // At version 4 the kinds and activity ids are already current, so these old-looking values are left alone.
    const phone = oldPhone(4, (db, kv) => {
      insert(db, 'custom_activities', custom('c-outdoor', 'outdoor'));
      insert(db, 'completion_events', { activity_id: 'skiing', done: 1, earlier: 1, at: '2025-01-02T00:00:00.000Z' });
      insert(db, 'place_visits', { place_id: 'columbus--osm-n42', activity_id: 'skiing', visited: 1, at: '2025-01-02T00:00:00.000Z' });
      insert(db, 'custom_activities', custom('c-calm', 'calm'));
      kv.set('savedIds', JSON.stringify(['skiing']));
    });
    launch(phone);

    expect(version(phone.db)).toBe(LATEST_VERSION);
    expect(all(phone.db, 'SELECT id, subcategory FROM custom_activities ORDER BY id')).toEqual([
      { id: 'c-calm', subcategory: 'outdoors' },
      { id: 'c-outdoor', subcategory: 'outdoor' },
    ]);
    expect(column(phone.db, 'SELECT activity_id FROM completion_events')).toEqual(['skiing']);
    expect(column(phone.db, 'SELECT earlier FROM completion_events')).toEqual([1]);
    expect(column(phone.db, 'SELECT place_id FROM place_visits')).toEqual(['osm:n42']);
    expect(setting(phone.kv, 'savedIds')).toEqual(['skiing']);
  });

  it('changes nothing when an up-to-date phone opens the app again', () => {
    const phone = firstVersionPhone();
    const first = launch(phone);
    first.recordVisit('columbus--osm-n99', 'skiing', true);
    first.saveDriveTimes('39.96,-83.00', new Map([['osm:n42', 25]]));
    const snapshot = JSON.stringify([first.exportUserData(), [...phone.kv], all(phone.db, 'SELECT * FROM drive_times')]);

    const second = launch(phone);

    expect(JSON.stringify([second.exportUserData(), [...phone.kv], all(phone.db, 'SELECT * FROM drive_times')])).toBe(snapshot);
  });
});

describe('catalog aliases', () => {
  function phoneWithHistory() {
    const phone = newPhone();
    const storage = launch(phone);
    storage.recordCompletion('old-idea', true);
    storage.recordVisit('osm:old', 'old-idea', true);
    storage.recordReflection({ entryId: 'old-idea', placeId: 'osm:old', placeName: 'Old Hall', rating: 'loved', note: 'Great', photo: null });
    storage.recordPlan('columbus', 'old-idea', { placeId: 'osm:old', placeName: 'Old Hall', day: '2026-11-07' });
    storage.saveDriveTimes('origin', new Map([['osm:old', 10], ['osm:other', 12]]));
    storage.writeSetting('savedIds', ['old-idea', 'new-idea', 'kept']);
    storage.writeSetting('hiddenIds', ['osm:old']);
    return { phone, storage };
  }

  const aliases = { 'old-idea': 'new-idea', 'osm:old': 'osm:new' };

  it('moves every stored id onto its new one', () => {
    const { phone, storage } = phoneWithHistory();
    storage.applyAliases(aliases);

    expect(storage.loadDoneIds()).toEqual(new Set(['new-idea']));
    expect(storage.loadVisitedPlaceIds()).toEqual(new Set(['osm:new']));
    expect(column(phone.db, 'SELECT activity_id FROM place_visits')).toEqual(['new-idea']);
    expect(storage.loadMemories()).toEqual([expect.objectContaining({ entryId: 'new-idea', placeId: 'osm:new', note: 'Great' })]);
    expect(storage.loadPlans().get('columbus/new-idea')).toEqual(expect.objectContaining({ placeId: 'osm:new', day: '2026-11-07' }));
    // The renamed place's drive time is dropped so it is fetched again, and other places keep theirs.
    expect(column(phone.db, 'SELECT place_id FROM drive_times')).toEqual(['osm:other']);
    expect(storage.readSetting('savedIds', [])).toEqual(['new-idea', 'kept']);
    expect(storage.readSetting('hiddenIds', [])).toEqual(['osm:new']);
  });

  it('runs once per list of aliases', () => {
    const { phone, storage } = phoneWithHistory();
    storage.applyAliases(aliases);
    // Something recorded under the old id after the move stays put until the list changes.
    storage.recordCompletion('old-idea', true);
    storage.applyAliases(aliases);
    expect(column(phone.db, 'SELECT activity_id FROM completion_events ORDER BY id')).toEqual(['new-idea', 'old-idea']);

    storage.applyAliases({ ...aliases, 'another-old': 'another-new' });
    expect(column(phone.db, 'SELECT activity_id FROM completion_events ORDER BY id')).toEqual(['new-idea', 'new-idea']);
  });

  it('runs again after a backup is restored, since the backup may use old ids', () => {
    const { storage } = phoneWithHistory();
    storage.applyAliases(aliases);
    const backup = storage.exportUserData();
    backup.tables.completion_events.push({ activity_id: 'old-idea', done: 1, earlier: 0, at: '2026-01-01T00:00:00.000Z' });

    storage.mergeUserData(backup);
    expect(storage.loadDoneIds()).toEqual(new Set(['new-idea', 'old-idea']));
    storage.applyAliases(aliases);
    expect(storage.loadDoneIds()).toEqual(new Set(['new-idea']));
  });
});

describe('backups across versions', () => {
  it('refuses a backup from a newer schema instead of merging rows it does not understand', () => {
    const storage = launch(newPhone());
    const backup = { ...storage.exportUserData(), schema: LATEST_VERSION + 1 };
    expect(() => storage.mergeUserData(backup)).toThrow('newer version of the app');
  });

  it('restores a backup into a phone upgraded from the first version', () => {
    const source = launch(newPhone());
    source.recordCompletion('pottery', true);
    source.recordPlan('columbus', 'hiking', { placeId: 'osm:n1', placeName: 'Trailhead', day: '2026-11-07' });
    const backup = source.exportUserData();

    const phone = firstVersionPhone();
    const storage = launch(phone);
    expect(storage.mergeUserData(backup)).toBe(2);
    expect(storage.mergeUserData(backup)).toBe(0);
    expect(storage.loadDoneIds()).toEqual(new Set(['snow-sports', 'new-cuisine', 'pottery']));
    expect(storage.loadPlans().get('columbus/hiking')).toEqual(expect.objectContaining({ placeName: 'Trailhead' }));
  });
});
