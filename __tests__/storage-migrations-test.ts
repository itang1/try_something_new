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
      prepareSync: (sql: string) => {
        const statement = db.prepare(sql);
        return { executeSync: (params: Value[]) => statement.run(...params), finalizeSync: () => {} };
      },
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
    removeItemSync: (key: string) => globalThis.fakeStorage.kv.delete(key),
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

const LATEST_VERSION = 8;

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

/** A downloaded city, small enough to read. */
const COLUMBUS = {
  id: 'columbus',
  name: 'Columbus',
  region: 'OH',
  country: 'US',
  lat: 39.96,
  lng: -83.0,
  icons: [{ id: 'short-north', name: 'Walk the Short North', place: 'pick:short-north', activity: 'neighborhood' }],
  aliases: { 'osm:old-park': 'osm:n42' },
  places: [
    { id: 'osm:n42', name: 'Snow Trails', lat: 40.5, lng: -82.5, activities: ['snow-sports'] },
    { id: 'pick:short-north', name: 'Short North', lat: 39.98, lng: -83.0, activities: ['neighborhood', 'food-market'], cost: 'Free' },
    { id: 'ovt:clay', name: 'Clay Studio', lat: 39.95, lng: -83.01, activities: ['pottery-class'], duration: '2-3 hours' },
  ],
};

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
    insert(db, 'catalog_cities', { id: 'columbus', hash: 'abc', json: JSON.stringify(COLUMBUS), at: '2025-01-01T00:00:00.000Z' });
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
    const tables = ['completion_events', 'place_visits', 'reflections', 'plans', 'custom_activities'];
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

    expect(column(phone.db, 'SELECT activity_id FROM completion_events ORDER BY seq')).toEqual([
      'snow-sports',
      'new-cuisine',
      'pottery',
      'pottery',
    ]);
    expect(column(phone.db, 'SELECT activity_id FROM place_visits ORDER BY seq')).toEqual(['snow-sports', 'museums']);
    expect(column(phone.db, 'SELECT entry_id FROM reflections ORDER BY seq')).toEqual(['snow-sports', 'new-cuisine']);
    expect(column(phone.db, 'SELECT entry_id FROM plans ORDER BY seq')).toEqual(['new-cuisine', 'museums']);
    // Skiing and snowboarding were both saved, and are now one saved idea.
    expect(storage.loadList('saved')).toEqual(['snow-sports', 'pottery']);
    expect(storage.loadList('hidden')).toEqual(['new-cuisine']);
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

    expect(column(phone.db, 'SELECT place_id FROM place_visits ORDER BY seq')).toEqual(['osm:n42', 'pick:art-museum']);
    expect(column(phone.db, 'SELECT place_id FROM reflections ORDER BY seq')).toEqual(['osm:n42', null]);
    expect(column(phone.db, 'SELECT place_id FROM plans ORDER BY seq')).toEqual(['osm:w7', null]);
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
    const storage = launch(phone);

    expect(version(phone.db)).toBe(LATEST_VERSION);
    expect(all(phone.db, 'SELECT id, subcategory FROM custom_activities ORDER BY id')).toEqual([
      { id: 'c-calm', subcategory: 'outdoors' },
      { id: 'c-outdoor', subcategory: 'outdoor' },
    ]);
    expect(column(phone.db, 'SELECT activity_id FROM completion_events')).toEqual(['skiing']);
    expect(column(phone.db, 'SELECT earlier FROM completion_events')).toEqual([1]);
    expect(column(phone.db, 'SELECT place_id FROM place_visits')).toEqual(['osm:n42']);
    expect(storage.loadList('saved')).toEqual(['skiing']);
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
    for (const id of ['old-idea', 'new-idea', 'kept']) storage.recordListChange('saved', id, true);
    storage.recordListChange('hidden', 'osm:old', true);
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
    expect(storage.loadList('saved')).toEqual(['new-idea', 'kept']);
    expect(storage.loadList('hidden')).toEqual(['osm:new']);
  });

  it('runs once per list of aliases', () => {
    const { phone, storage } = phoneWithHistory();
    storage.applyAliases(aliases);
    // Something recorded under the old id after the move stays put until the list changes.
    storage.recordCompletion('old-idea', true);
    storage.applyAliases(aliases);
    expect(column(phone.db, 'SELECT activity_id FROM completion_events ORDER BY seq')).toEqual(['new-idea', 'old-idea']);

    storage.applyAliases({ ...aliases, 'another-old': 'another-new' });
    expect(column(phone.db, 'SELECT activity_id FROM completion_events ORDER BY seq')).toEqual(['new-idea', 'new-idea']);
  });

  it('runs again after a backup is restored, since the backup may use old ids', () => {
    const { storage } = phoneWithHistory();
    storage.applyAliases(aliases);
    const backup = storage.exportUserData();
    backup.tables.completion_events!.push({ activity_id: 'old-idea', done: 1, earlier: 0, at: '2026-01-01T00:00:00.000Z' });

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LOGS = ['completion_events', 'place_visits', 'reflections', 'plans'];

describe('getting ready for sync (version 7)', () => {
  it('gives every old row its own random id and this device, keeping the order', () => {
    const phone = firstVersionPhone();
    const storage = launch(phone);
    const device = storage.deviceId();

    expect(device).toMatch(UUID);
    for (const table of LOGS) {
      const ids = column(phone.db, `SELECT id FROM ${table}`);
      expect(ids.every((id) => UUID.test(String(id)))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(column(phone.db, `SELECT device_id FROM ${table}`))).toEqual(new Set([device]));
    }
    // seq is the old number, so the history keeps its order.
    expect(column(phone.db, 'SELECT seq FROM completion_events ORDER BY seq')).toEqual([1, 2, 3, 4]);
    // Custom activities keep the ids history already points at.
    expect(column(phone.db, 'SELECT id FROM custom_activities ORDER BY id')).toEqual(['c-calm', 'c-craft', 'c-food', 'c-museum', 'c-outdoor', 'c-social']);
  });

  it('turns the saved and hidden lists into events and drops the old settings', () => {
    const phone = firstVersionPhone();
    launch(phone);

    expect(all(phone.db, 'SELECT list, entry_id, added FROM list_events ORDER BY seq')).toEqual([
      { list: 'saved', entry_id: 'snow-sports', added: 1 },
      { list: 'saved', entry_id: 'pottery', added: 1 },
      { list: 'hidden', entry_id: 'new-cuisine', added: 1 },
    ]);
    expect(phone.kv.has('savedIds')).toBe(false);
    expect(phone.kv.has('hiddenIds')).toBe(false);
  });

  it('keeps the same device id across launches, and new rows get fresh ids', () => {
    const phone = newPhone();
    const first = launch(phone);
    const device = first.deviceId();
    first.recordCompletion('pottery', true);

    const second = launch(phone);
    second.recordCompletion('pottery', false);
    expect(second.deviceId()).toBe(device);
    const ids = column(phone.db, 'SELECT id FROM completion_events');
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(second.newId()).toMatch(UUID);
  });

  it('records saving, unsaving and hiding as events', () => {
    const storage = launch(newPhone());
    storage.recordListChange('saved', 'pottery', true);
    storage.recordListChange('saved', 'hiking', true);
    storage.recordListChange('saved', 'pottery', false);
    storage.recordListChange('hidden', 'bowling', true);

    expect(storage.loadList('saved')).toEqual(['hiking']);
    expect(storage.loadList('hidden')).toEqual(['bowling']);
  });

  it('gives a deleted custom activity a new seq, so sync sees the delete', () => {
    const phone = newPhone();
    const storage = launch(phone);
    storage.saveCustomActivity({ id: 'custom-a', cityId: 'columbus', name: 'Kite', subcategory: 'play', duration: '1 hour', cost: 'Free' });
    const { cursor } = storage.changesSince();

    storage.deleteCustomActivity('custom-a');

    expect(storage.loadCustomActivities()).toEqual([]);
    expect(storage.changesSince(cursor).changes.custom_activities).toEqual([expect.objectContaining({ id: 'custom-a', deleted: 1 })]);
    expect(count(phone.db, 'custom_activities')).toBe(1);
  });
});

describe('sync', () => {
  it('sends only what changed since the cursor', () => {
    const storage = launch(newPhone());
    storage.recordCompletion('pottery', true);
    const first = storage.changesSince();
    expect(first.changes.completion_events).toHaveLength(1);
    expect(first.changes.completion_events[0]).not.toHaveProperty('seq');

    storage.recordListChange('saved', 'hiking', true);
    const second = storage.changesSince(first.cursor);
    expect(second.changes.completion_events).toEqual([]);
    expect(second.changes.list_events).toEqual([expect.objectContaining({ entry_id: 'hiking', added: 1 })]);
    expect(storage.changesSince(second.cursor).changes.list_events).toEqual([]);
  });

  it('merges two phones by the latest event, and applying twice changes nothing', () => {
    const phoneA = launch(newPhone());
    phoneA.recordListChange('saved', 'pottery', true);
    phoneA.recordCompletion('hiking', true);
    const fromA = phoneA.changesSince().changes;

    const phoneB = launch(newPhone());
    expect(phoneB.applyChanges(fromA)).toBe(2);
    expect(phoneB.applyChanges(fromA)).toBe(0);
    expect(phoneB.loadList('saved')).toEqual(['pottery']);
    expect(phoneB.loadDoneIds()).toEqual(new Set(['hiking']));

    // A later unsave on B beats A's earlier save, even when B's row arrives at A after A's own.
    const later = { ...fromA.list_events[0], id: phoneB.newId(), device_id: phoneB.deviceId(), added: 0, at: '2999-01-01T00:00:00.000Z' };
    phoneA.applyChanges({ list_events: [later] });
    expect(phoneA.loadList('saved')).toEqual([]);
    // And an older row arriving late doesn't undo a newer one.
    const older = { ...fromA.completion_events[0], id: phoneB.newId(), done: 0, at: '2000-01-01T00:00:00.000Z' };
    phoneA.applyChanges({ completion_events: [older] });
    expect(phoneA.loadDoneIds()).toEqual(new Set(['hiking']));
  });

  it('keeps the newer version of a custom activity', () => {
    const storage = launch(newPhone());
    const row = { id: 'custom-x', device_id: 'd', city_id: 'columbus', name: 'Old', subcategory: 'play', duration: 'hour', cost: 'free', deleted: 0 };
    storage.applyChanges({ custom_activities: [{ ...row, at: '2026-01-02T00:00:00.000Z' }] });
    expect(storage.applyChanges({ custom_activities: [{ ...row, name: 'Older', at: '2026-01-01T00:00:00.000Z' }] })).toBe(0);
    expect(storage.applyChanges({ custom_activities: [{ ...row, name: 'New', at: '2026-01-03T00:00:00.000Z' }] })).toBe(1);
    expect(storage.loadCustomActivities()).toEqual([expect.objectContaining({ id: 'custom-x', name: 'New' })]);
  });
});

describe('backups from before version 7', () => {
  it('adds rows without ids once, and turns the old saved and hidden lists into events', () => {
    const storage = launch(newPhone());
    storage.recordListChange('saved', 'kept-unsaved', true);
    storage.recordListChange('saved', 'kept-unsaved', false);
    const backup = {
      schema: 6,
      tables: {
        completion_events: [
          { activity_id: 'pottery', done: 1, earlier: 0, at: '2025-01-01T00:00:00.000Z' },
          { activity_id: 'pottery', done: 1, earlier: 0, at: '2025-01-01T00:00:00.000Z' },
        ],
        plans: [{ entry_id: 'hiking', city_id: 'columbus', place_id: null, place_name: null, day: '2026-11-07', at: '2025-01-01T00:00:00.000Z' }],
      },
      settings: { savedIds: ['pottery', 'kept-unsaved'], hiddenIds: ['bowling'] },
    } as unknown as Parameters<Storage['mergeUserData']>[0];

    expect(storage.mergeUserData(backup)).toBe(2);
    expect(storage.mergeUserData(backup)).toBe(0);
    expect(storage.loadDoneIds()).toEqual(new Set(['pottery']));
    expect(storage.loadPlans().get('columbus/hiking')).toEqual(expect.objectContaining({ day: '2026-11-07' }));
    // Unsaving on this phone is a newer record than the old list, so it stays unsaved.
    expect(storage.loadList('saved')).toEqual(['pottery']);
    expect(storage.loadList('hidden')).toEqual(['bowling']);
  });
});

describe('catalog places in tables (version 8)', () => {
  it('moves a downloaded city out of its JSON blob into rows, keeping every place and its order', () => {
    const phone = firstVersionPhone();
    const storage = launch(phone);

    expect(storage.loadCatalogCities()).toEqual([{ hash: 'abc', meta: expect.objectContaining({ id: 'columbus', aliases: COLUMBUS.aliases }) }]);
    expect(storage.loadCatalogCities()[0].meta).not.toHaveProperty('places');
    expect(storage.loadCatalogPlaces('columbus')).toEqual(
      COLUMBUS.places.map((p) => ({ ...p, activities: expect.arrayContaining(p.activities) })),
    );
    expect(column(phone.db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'catalog_cities'")).toEqual(['catalog_cities']);
    expect(column(phone.db, 'SELECT COUNT(*) FROM pragma_table_info(\'catalog_cities\') WHERE name = \'json\'')).toEqual([0]);
  });

  it('drops a blob that does not parse, so the city downloads again', () => {
    const phone = oldPhone(7, (db) => {
      db.exec('CREATE TABLE IF NOT EXISTS list_events (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, device_id TEXT NOT NULL, list TEXT NOT NULL, entry_id TEXT NOT NULL, added INTEGER NOT NULL, at TEXT NOT NULL)');
      insert(db, 'catalog_cities', { id: 'seoul', hash: 'x', json: '{"id":', at: '2025-01-01T00:00:00.000Z' });
    });
    const storage = launch(phone);

    expect(version(phone.db)).toBe(LATEST_VERSION);
    expect(storage.loadCatalogCities()).toEqual([]);
  });

  it('finds places by bounding box, by activity and by id', () => {
    const storage = launch(newPhone());
    storage.saveCatalogCity(COLUMBUS as never, 'abc');

    const downtown = storage.placesInBox('columbus', { south: 39.9, north: 40.0, west: -83.1, east: -82.9 });
    expect(downtown.map((p) => p.id)).toEqual(['pick:short-north', 'ovt:clay']);
    expect(storage.placesInBox('chicago', { south: 39.9, north: 40.0, west: -83.1, east: -82.9 })).toEqual([]);
    expect(storage.placesFor('columbus', 'pottery-class').map((p) => p.id)).toEqual(['ovt:clay']);
    expect(storage.placesFor('columbus', 'pottery-class', ['osm:n42']).map((p) => p.id)).toEqual(['osm:n42', 'ovt:clay']);
    expect(storage.citiesWithPlace('ovt:clay')).toEqual(['columbus']);
  });

  it('replaces a city\'s rows when it downloads again', () => {
    const storage = launch(newPhone());
    storage.saveCatalogCity(COLUMBUS as never, 'abc');
    storage.saveCatalogCity({ ...COLUMBUS, places: [COLUMBUS.places[2]] } as never, 'def');

    expect(storage.loadCatalogCities()).toEqual([expect.objectContaining({ hash: 'def' })]);
    expect(storage.loadCatalogPlaces('columbus').map((p) => p.id)).toEqual(['ovt:clay']);
    expect(storage.placesFor('columbus', 'neighborhood')).toEqual([]);
  });
});

describe('cities read from the tables', () => {
  /** Loads cities.ts against a phone, the way the app does on launch. */
  function launchCities(fake: Fake): typeof import('@/data/cities') {
    globalThis.fakeStorage = fake;
    let cities!: typeof import('@/data/cities');
    jest.isolateModules(() => {
      cities = require('@/data/cities');
    });
    return cities;
  }

  it('seeds the bundled city once, and reads aliases and summaries without loading places', () => {
    const phone = firstVersionPhone();
    const cities = launchCities(phone);
    const bundled = count(phone.db, 'catalog_places');
    launchCities(phone);

    expect(count(phone.db, 'catalog_places')).toBe(bundled);
    expect(column(phone.db, 'SELECT id FROM catalog_cities ORDER BY id')).toEqual(['columbus', 'los-angeles']);
    expect(cities.nearestCity({ latitude: 40, longitude: -83 }, true).city.id).toBe('columbus');
    expect(cities.citySummary('columbus')).toEqual(expect.objectContaining({ name: 'Columbus', region: 'OH' }));
  });

  it('finds the nearest places by growing a box around the point', () => {
    const cities = launchCities(firstVersionPhone());
    const near = cities.nearestPlaces('columbus', { latitude: 39.96, longitude: -83.0 }, 2);
    expect(near.map((p) => p.id)).toEqual(['ovt:clay', 'pick:short-north']);
    // The ski hill is about 80 km out, past the smaller boxes.
    expect(cities.nearestPlaces('columbus', { latitude: 39.96, longitude: -83.0 }, 3).map((p) => p.id)).toContain('osm:n42');
  });

  it('finds history in a city that is not loaded, by its place', () => {
    const cities = launchCities(firstVersionPhone());
    cities.localCity('los-angeles');

    const found = cities.findEntryAnywhere('pottery-class', 'ovt:clay');
    expect(found?.city.id).toBe('columbus');
    expect(found?.city.places.find((p) => p.id === 'ovt:clay')?.name).toBe('Clay Studio');
    expect(found?.entry.places.map((p) => p.id)).toEqual(['ovt:clay']);
    expect(cities.findEntryAnywhere('short-north')?.entry).toEqual(expect.objectContaining({ kind: 'icon', name: 'Walk the Short North' }));
  });

  it('keeps the whole city in use, with every place in order', () => {
    const cities = launchCities(firstVersionPhone());
    const city = cities.localCity('columbus')!;
    expect(city.places.map((p) => p.id)).toEqual(COLUMBUS.places.map((p) => p.id));
    expect(cities.localCity('columbus')).toBe(city);
  });
});
