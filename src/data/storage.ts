import { openDatabaseSync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import type { City, CustomActivity, Place } from './catalog';

const db = openDatabaseSync('app.db');

// Everything the user makes, and that sync and backups carry. Each table also has `seq`, which never leaves the phone.
const SYNCED_TABLES = {
  completion_events: ['id', 'device_id', 'activity_id', 'done', 'earlier', 'at'],
  place_visits: ['id', 'device_id', 'place_id', 'activity_id', 'visited', 'at'],
  reflections: ['id', 'device_id', 'entry_id', 'place_id', 'place_name', 'rating', 'note', 'photo', 'at'],
  plans: ['id', 'device_id', 'entry_id', 'city_id', 'place_id', 'place_name', 'day', 'at'],
  custom_activities: ['id', 'device_id', 'city_id', 'name', 'subcategory', 'duration', 'cost', 'deleted', 'at'],
  list_events: ['id', 'device_id', 'list', 'entry_id', 'added', 'at'],
} as const;

export type SyncedTable = keyof typeof SYNCED_TABLES;
type Row = Record<string, string | number | null>;

// Column definitions after seq, id and device_id, in the order of SYNCED_TABLES.
const TABLE_COLUMNS: Record<SyncedTable, string> = {
  completion_events: 'activity_id TEXT NOT NULL, done INTEGER NOT NULL, earlier INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL',
  place_visits: 'place_id TEXT NOT NULL, activity_id TEXT NOT NULL, visited INTEGER NOT NULL, at TEXT NOT NULL',
  reflections: 'entry_id TEXT NOT NULL, place_id TEXT, place_name TEXT, rating TEXT, note TEXT, photo TEXT, at TEXT NOT NULL',
  plans: 'entry_id TEXT NOT NULL, city_id TEXT NOT NULL, place_id TEXT, place_name TEXT, day TEXT, at TEXT NOT NULL',
  custom_activities:
    'city_id TEXT NOT NULL, name TEXT NOT NULL, subcategory TEXT NOT NULL, duration TEXT NOT NULL, cost TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL',
  // A saved or hidden idea. Added is 1 when it went onto the list and 0 when it came off.
  list_events: 'list TEXT NOT NULL, entry_id TEXT NOT NULL, added INTEGER NOT NULL, at TEXT NOT NULL',
};

const createTable = (table: SyncedTable) =>
  `CREATE TABLE IF NOT EXISTS ${table} (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, device_id TEXT NOT NULL, ${TABLE_COLUMNS[table]});`;

// The latest event wins, so each log is read newest first by time, with seq breaking ties between rows from the same moment.
const INDEXES = `
  CREATE INDEX IF NOT EXISTS completion_events_activity ON completion_events (activity_id, at, seq);
  CREATE INDEX IF NOT EXISTS place_visits_place ON place_visits (place_id, at, seq);
  CREATE INDEX IF NOT EXISTS reflections_entry ON reflections (entry_id, at, seq);
  CREATE INDEX IF NOT EXISTS plans_entry ON plans (city_id, entry_id, at, seq);
  CREATE INDEX IF NOT EXISTS list_events_entry ON list_events (list, entry_id, at, seq);
`;

/** A random version 4 UUID, made by SQLite so no extra native module is needed. */
const NEW_ID = `lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
  || substr('89ab', 1 + abs(random()) % 4, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))`;

export function newId(): string {
  return db.getFirstSync<{ id: string }>(`SELECT ${NEW_ID} AS id`)!.id;
}

/** Made once per install and never backed up, so a restored phone still counts as its own device. */
export function deviceId(): string {
  let id = readSetting<string | null>('deviceId', null);
  if (!id) {
    id = newId();
    writeSetting('deviceId', id);
  }
  return id;
}

const now = () => new Date().toISOString();

/** Adds one row the user just made, with a fresh id, this device and the time. */
function insertRow(table: SyncedTable, row: Row): void {
  const full: Row = { id: newId(), device_id: deviceId(), ...row, at: now() };
  const columns = Object.keys(full);
  db.runSync(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, Object.values(full));
}

/** The row of a log that holds the current state for the key columns. */
const latest = (table: SyncedTable, alias: string, keys: string[]) =>
  `${alias}.seq = (SELECT seq FROM ${table} WHERE ${keys.map((k) => `${k} = ${alias}.${k}`).join(' AND ')} ORDER BY at DESC, seq DESC LIMIT 1)`;

const CATALOG_TABLES = `
  CREATE TABLE IF NOT EXISTS catalog_cities (id TEXT PRIMARY KEY, hash TEXT, meta TEXT NOT NULL, at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS catalog_places (
    city_id TEXT NOT NULL,
    id TEXT NOT NULL,
    ord INTEGER NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    duration TEXT,
    cost TEXT,
    wheelchair TEXT,
    hours TEXT,
    PRIMARY KEY (city_id, id)
  ) WITHOUT ROWID;
  CREATE INDEX IF NOT EXISTS catalog_places_box ON catalog_places (city_id, lat, lng);
  CREATE INDEX IF NOT EXISTS catalog_places_order ON catalog_places (city_id, ord);
  CREATE INDEX IF NOT EXISTS catalog_places_id ON catalog_places (id);
  CREATE TABLE IF NOT EXISTS catalog_place_activities (
    city_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    PRIMARY KEY (city_id, place_id, activity_id)
  ) WITHOUT ROWID;
  CREATE INDEX IF NOT EXISTS catalog_place_activities_activity ON catalog_place_activities (city_id, activity_id);
`;

// The tables as the first version of the app made them. The steps below bring them up to date.
db.execSync(`
  CREATE TABLE IF NOT EXISTS completion_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id TEXT NOT NULL,
    done INTEGER NOT NULL,
    at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS completion_events_activity ON completion_events (activity_id, id);
  CREATE TABLE IF NOT EXISTS place_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    visited INTEGER NOT NULL,
    at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS place_visits_place ON place_visits (place_id, id);
  CREATE TABLE IF NOT EXISTS reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    place_id TEXT,
    rating TEXT,
    note TEXT,
    photo TEXT,
    at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS custom_activities (
    id TEXT PRIMARY KEY,
    city_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    duration TEXT NOT NULL,
    cost TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    city_id TEXT NOT NULL,
    place_id TEXT,
    day TEXT,
    at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS plans_entry ON plans (city_id, entry_id, id);
  CREATE TABLE IF NOT EXISTS drive_times (
    origin TEXT NOT NULL,
    place_id TEXT NOT NULL,
    minutes INTEGER,
    at TEXT NOT NULL,
    PRIMARY KEY (origin, place_id)
  );
  CREATE TABLE IF NOT EXISTS catalog_cities (
    id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    json TEXT NOT NULL,
    at TEXT NOT NULL
  );
`);

// Each step runs once, when stored ids or kinds change shape. Give each new step a test in __tests__/storage-migrations-test.ts.
const { user_version: version } = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')!;
if (version < 1) {
  const kinds: Record<string, string> = {
    outdoor: 'move',
    museum: 'explore',
    hike: 'outdoors',
    beach: 'water',
    shopping: 'explore',
    nature: 'outdoors',
    entertainment: 'shows',
    landmark: 'explore',
    neighborhoods: 'explore',
    craft: 'make',
  };
  for (const [from, to] of Object.entries(kinds)) {
    db.runSync('UPDATE custom_activities SET subcategory = ? WHERE subcategory = ?', [to, from]);
  }
  const filters = readSetting<{ subcategories?: string[] } | null>('exploreFilters', null);
  if (filters?.subcategories?.length) {
    const subcategories = [...new Set(filters.subcategories.map((k) => kinds[k] ?? k))];
    writeSetting('exploreFilters', { ...filters, subcategories });
  }
  db.execSync('PRAGMA user_version = 1');
}
if (version < 2) {
  const renamed: Record<string, string> = { skiing: 'snow-sports', snowboarding: 'snow-sports', 'korean-bbq': 'new-cuisine' };
  for (const [from, to] of Object.entries(renamed)) {
    db.runSync('UPDATE completion_events SET activity_id = ? WHERE activity_id = ?', [to, from]);
    db.runSync('UPDATE place_visits SET activity_id = ? WHERE activity_id = ?', [to, from]);
    db.runSync('UPDATE reflections SET entry_id = ? WHERE entry_id = ?', [to, from]);
    db.runSync('UPDATE plans SET entry_id = ? WHERE entry_id = ?', [to, from]);
  }
  for (const key of ['savedIds', 'hiddenIds']) {
    const ids = readSetting<string[]>(key, []);
    writeSetting(key, [...new Set(ids.map((id) => renamed[id] ?? id))]);
  }
  db.execSync('PRAGMA user_version = 2');
}
// Places come and go with catalog updates, so history keeps the name it had.
if (version < 3) {
  db.execSync(`
    ALTER TABLE reflections ADD COLUMN place_name TEXT;
    ALTER TABLE plans ADD COLUMN place_name TEXT;
    PRAGMA user_version = 3;
  `);
}
if (version < 4) {
  db.execSync(`
    ALTER TABLE completion_events ADD COLUMN earlier INTEGER NOT NULL DEFAULT 0;
    PRAGMA user_version = 4;
  `);
}
// Place ids lost their city: "columbus--osm-n1" became "osm:n1", and hand-picked "columbus--x" became "pick:x".
if (version < 5) {
  for (const [table, column] of [
    ['place_visits', 'place_id'],
    ['reflections', 'place_id'],
    ['plans', 'place_id'],
  ]) {
    db.execSync(`
      UPDATE ${table} SET ${column} = 'osm:' || substr(${column}, instr(${column}, '--osm-') + 6) WHERE ${column} LIKE '%--osm-%';
      UPDATE ${table} SET ${column} = 'pick:' || substr(${column}, instr(${column}, '--') + 2) WHERE ${column} LIKE '%--%';
    `);
  }
  db.execSync('DELETE FROM drive_times; PRAGMA user_version = 5;');
}
// Calm and Social became filters instead of kinds.
if (version < 6) {
  const kinds: Record<string, string> = { calm: 'outdoors', social: 'play' };
  for (const [from, to] of Object.entries(kinds)) {
    db.runSync('UPDATE custom_activities SET subcategory = ? WHERE subcategory = ?', [to, from]);
  }
  const filters = readSetting<{ subcategories?: string[] } | null>('exploreFilters', null);
  if (filters?.subcategories?.length) {
    const subcategories = [...new Set(filters.subcategories.map((k) => kinds[k] ?? k))];
    writeSetting('exploreFilters', { ...filters, subcategories });
  }
  db.execSync('PRAGMA user_version = 6');
}

// Version 7 gets the data ready to sync between devices. Every row the user makes gets a random id made on the phone,
// so two devices never hand out the same one, and the device that made it. The old number becomes `seq`, which only
// orders rows on this phone and tells sync what changed since it last ran. Saved and hidden ideas become events too.
if (version < 7) {
  const device = deviceId();
  db.withTransactionSync(() => {
    for (const [table, columns] of Object.entries(SYNCED_TABLES) as [SyncedTable, readonly string[]][]) {
      if (table === 'list_events') continue;
      const content = columns.filter((c) => c !== 'id' && c !== 'device_id');
      const custom = table === 'custom_activities';
      db.execSync(`ALTER TABLE ${table} RENAME TO ${table}_v6; ${createTable(table)}`);
      db.runSync(
        `INSERT INTO ${table} (${custom ? '' : 'seq, '}id, device_id, ${content.join(', ')})
         SELECT ${custom ? 'id' : `id, ${NEW_ID}`}, ?, ${content.join(', ')} FROM ${table}_v6 ORDER BY ${custom ? 'at, rowid' : 'id'}`,
        [device],
      );
      db.execSync(`DROP TABLE ${table}_v6`);
    }
    db.execSync(createTable('list_events'));
    for (const [list, key] of [
      ['saved', 'savedIds'],
      ['hidden', 'hiddenIds'],
    ] as const) {
      for (const entryId of readSetting<string[]>(key, [])) recordListChange(list, entryId, true);
      Storage.removeItemSync(key);
    }
    db.execSync(`${INDEXES} PRAGMA user_version = 7;`);
  });
}

// Version 8 moves downloaded cities out of one JSON blob each and into indexed tables, so launch reads only what it
// needs: the city's summary and aliases without its places, and places by bounding box. Bundled cities are seeded too.
if (version < 8) {
  db.withTransactionSync(() => {
    const blobs = db.getAllSync<{ id: string; hash: string; json: string }>('SELECT id, hash, json FROM catalog_cities');
    db.execSync(`DROP TABLE catalog_cities; ${CATALOG_TABLES}`);
    for (const { id, hash, json } of blobs) {
      const city = parseCity(json);
      // A blob that doesn't parse is dropped, and the city downloads again.
      if (city?.id === id) writeCity(city, hash);
    }
    db.execSync('PRAGMA user_version = 8');
  });
}

// Version 9 keeps each place's wheelchair access and opening hours. Places stored before it don't have them, so
// downloaded cities are marked stale to download again, and bundled ones are seeded again on this launch.
if (version < 9) {
  db.withTransactionSync(() => {
    const columns = new Set(db.getAllSync<{ name: string }>("SELECT name FROM pragma_table_info('catalog_places')").map((c) => c.name));
    if (!columns.has('wheelchair')) db.execSync('ALTER TABLE catalog_places ADD COLUMN wheelchair TEXT');
    if (!columns.has('hours')) db.execSync('ALTER TABLE catalog_places ADD COLUMN hours TEXT');
    db.execSync(`
      UPDATE catalog_cities SET hash = '' WHERE hash IS NOT NULL;
      DELETE FROM catalog_places WHERE city_id IN (SELECT id FROM catalog_cities WHERE hash IS NULL);
      DELETE FROM catalog_place_activities WHERE city_id IN (SELECT id FROM catalog_cities WHERE hash IS NULL);
      DELETE FROM catalog_cities WHERE hash IS NULL;
      PRAGMA user_version = 9;
    `);
  });
}

/** Moves stored ids onto their new ones when the catalog renames or merges something. Runs only when the list changes. */
export function applyAliases(aliases: Record<string, string>): void {
  const key = JSON.stringify(aliases);
  if (readSetting('appliedAliases', '') === key) return;
  db.withTransactionSync(() => {
    for (const [from, to] of Object.entries(aliases)) {
      db.runSync('UPDATE completion_events SET activity_id = ? WHERE activity_id = ?', [to, from]);
      db.runSync('UPDATE place_visits SET activity_id = ? WHERE activity_id = ?', [to, from]);
      db.runSync('UPDATE place_visits SET place_id = ? WHERE place_id = ?', [to, from]);
      db.runSync('UPDATE reflections SET entry_id = ? WHERE entry_id = ?', [to, from]);
      db.runSync('UPDATE reflections SET place_id = ? WHERE place_id = ?', [to, from]);
      db.runSync('UPDATE plans SET entry_id = ? WHERE entry_id = ?', [to, from]);
      db.runSync('UPDATE plans SET place_id = ? WHERE place_id = ?', [to, from]);
      db.runSync('UPDATE list_events SET entry_id = ? WHERE entry_id = ?', [to, from]);
      db.runSync('DELETE FROM drive_times WHERE place_id = ?', [from]);
      // Doing an activity at home or anywhere is stored as a visit to home:<activity> or any:<activity>, so those ids follow a rename too.
      for (const table of ['place_visits', 'reflections', 'plans']) {
        for (const prefix of ['home:', 'any:']) {
          db.runSync(`UPDATE ${table} SET place_id = ? WHERE place_id = ?`, [`${prefix}${to}`, `${prefix}${from}`]);
        }
      }
    }
  });
  writeSetting('appliedAliases', key);
}

export function loadDoneIds(): Set<string> {
  const rows = db.getAllSync<{ activity_id: string }>(
    `SELECT e.activity_id FROM completion_events e WHERE ${latest('completion_events', 'e', ['activity_id'])} AND e.done = 1`,
  );
  return new Set(rows.map((r) => r.activity_id));
}

/** Earlier means done before using the app: it counts as done but isn't a memory. */
export function recordCompletion(activityId: string, done: boolean, earlier = false): void {
  insertRow('completion_events', { activity_id: activityId, done: done ? 1 : 0, earlier: earlier ? 1 : 0 });
}

export function loadVisitedPlaceIds(): Set<string> {
  const rows = db.getAllSync<{ place_id: string }>(
    `SELECT v.place_id FROM place_visits v WHERE ${latest('place_visits', 'v', ['place_id'])} AND v.visited = 1`,
  );
  return new Set(rows.map((r) => r.place_id));
}

/** Same append-only shape as completions. The activity is kept so a visit can be credited to it later. */
export function recordVisit(placeId: string, activityId: string, visited: boolean): void {
  insertRow('place_visits', { place_id: placeId, activity_id: activityId, visited: visited ? 1 : 0 });
}

export type ListName = 'saved' | 'hidden';

/** Ideas on a list (saved, or hidden as "Not for me"), in the order they were added. */
export function loadList(list: ListName): string[] {
  const rows = db.getAllSync<{ entry_id: string }>(
    `SELECT l.entry_id FROM list_events l WHERE l.list = ? AND ${latest('list_events', 'l', ['list', 'entry_id'])} AND l.added = 1
     ORDER BY l.at, l.seq`,
    [list],
  );
  return rows.map((r) => r.entry_id);
}

/** Saved and hidden ideas are logs too, so a phone that unsaves something can tell the others. */
export function recordListChange(list: ListName, entryId: string, added: boolean): void {
  insertRow('list_events', { list, entry_id: entryId, added: added ? 1 : 0 });
}

export type Rating = 'loved' | 'fine' | 'not-for-me';

export type Reflection = {
  entryId: string;
  placeId: string | null;
  placeName: string | null;
  rating: Rating | null;
  note: string;
  photo: string | null;
};

export function recordReflection(r: Reflection): void {
  insertRow('reflections', {
    entry_id: r.entryId,
    place_id: r.placeId,
    place_name: r.placeName,
    rating: r.rating,
    note: r.note || null,
    photo: r.photo,
  });
}

/** The latest rating of each thing rated, so suggestions can learn from it. */
export function loadRatings(): { entryId: string; rating: Rating }[] {
  return db.getAllSync<{ entryId: string; rating: Rating }>(`
    SELECT r.entry_id AS entryId, r.rating FROM reflections r
    WHERE ${latest('reflections', 'r', ['entry_id'])} AND r.rating IS NOT NULL
  `);
}

export type Memory = {
  entryId: string;
  at: string;
  placeId: string | null;
  placeName: string | null;
  rating: Rating | null;
  note: string | null;
  photo: string | null;
};

/** Everything currently done, newest first, with its latest reflection if there is one. */
export function loadMemories(): Memory[] {
  return db.getAllSync<Memory>(`
    SELECT c.activity_id AS entryId, c.at, r.place_id AS placeId, r.place_name AS placeName, r.rating, r.note, r.photo
    FROM completion_events c
    LEFT JOIN reflections r ON r.seq = (SELECT seq FROM reflections WHERE entry_id = c.activity_id ORDER BY at DESC, seq DESC LIMIT 1)
    WHERE ${latest('completion_events', 'c', ['activity_id'])} AND c.done = 1 AND c.earlier = 0
    ORDER BY c.at DESC
  `);
}

export function loadCustomActivities(): CustomActivity[] {
  return db.getAllSync<CustomActivity>(`
    SELECT id, city_id AS cityId, name, subcategory, duration, cost FROM custom_activities
    WHERE deleted = 0 ORDER BY at, seq
  `);
}

export function saveCustomActivity(c: CustomActivity): void {
  insertRow('custom_activities', { id: c.id, city_id: c.cityId, name: c.name, subcategory: c.subcategory, duration: c.duration, cost: c.cost });
}

/**
 * Kept as a row so a later sync can tell other devices it was deleted.
 * The row is replaced rather than updated, so it gets a new seq and sync sees the change.
 */
export function deleteCustomActivity(id: string): void {
  db.runSync(
    `INSERT OR REPLACE INTO custom_activities (id, device_id, city_id, name, subcategory, duration, cost, deleted, at)
     SELECT id, ?, city_id, name, subcategory, duration, cost, 1, ? FROM custom_activities WHERE id = ?`,
    [deviceId(), now(), id],
  );
}

/** A day is a local YYYY-MM-DD key. Activity ids repeat across cities, so plans are kept per city. */
export type Plan = { entryId: string; cityId: string; placeId: string | null; placeName: string | null; day: string };

export const planKey = (cityId: string, entryId: string) => `${cityId}/${entryId}`;

export function loadPlans(): Map<string, Plan> {
  const rows = db.getAllSync<{ entry_id: string; city_id: string; place_id: string | null; place_name: string | null; day: string }>(
    `SELECT p.entry_id, p.city_id, p.place_id, p.place_name, p.day FROM plans p
     WHERE ${latest('plans', 'p', ['city_id', 'entry_id'])} AND p.day IS NOT NULL`,
  );
  return new Map(
    rows.map((r) => [
      planKey(r.city_id, r.entry_id),
      { entryId: r.entry_id, cityId: r.city_id, placeId: r.place_id, placeName: r.place_name, day: r.day },
    ]),
  );
}

/** Append-only like the other logs. A row with no day clears the plan. */
export function recordPlan(cityId: string, entryId: string, plan: Pick<Plan, 'placeId' | 'placeName' | 'day'> | null): void {
  insertRow('plans', {
    entry_id: entryId,
    city_id: cityId,
    place_id: plan?.placeId ?? null,
    place_name: plan?.placeName ?? null,
    day: plan?.day ?? null,
  });
}

export function readSetting<T>(key: string, fallback: T): T {
  try {
    const value = Storage.getItemSync(key);
    return value == null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function writeSetting<T>(key: string, value: T): void {
  Storage.setItemSync(key, JSON.stringify(value));
}

/** Cached drive times from one origin. A null means no route was found. */
export function loadDriveTimes(origin: string, maxAgeDays: number): Map<string, number | null> {
  const since = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();
  const rows = db.getAllSync<{ place_id: string; minutes: number | null }>(
    'SELECT place_id, minutes FROM drive_times WHERE origin = ? AND at >= ?',
    [origin, since],
  );
  return new Map(rows.map((r) => [r.place_id, r.minutes]));
}

export function saveDriveTimes(origin: string, times: Map<string, number | null>): void {
  const at = new Date().toISOString();
  db.withTransactionSync(() => {
    for (const [placeId, minutes] of times) {
      db.runSync('INSERT OR REPLACE INTO drive_times (origin, place_id, minutes, at) VALUES (?, ?, ?, ?)', [
        origin,
        placeId,
        minutes,
        at,
      ]);
    }
  });
}

// Catalog cities. Each city's summary, icons and aliases are one small row, and its places are rows of their own,
// indexed by position for bounding-box queries. A bundled city has no hash, so it doesn't count as downloaded.

/** A city without its places. */
export type CityMeta = Omit<City, 'places'>;

function parseCity(json: string): City | null {
  try {
    const city = JSON.parse(json) as City;
    return city && typeof city.id === 'string' && Array.isArray(city.places) ? city : null;
  } catch {
    return null;
  }
}

/** Replaces the city's rows. Call inside a transaction. */
function writeCity(city: City, hash: string | null): void {
  const { places, ...meta } = city;
  db.runSync('DELETE FROM catalog_places WHERE city_id = ?', [city.id]);
  db.runSync('DELETE FROM catalog_place_activities WHERE city_id = ?', [city.id]);
  db.runSync('INSERT OR REPLACE INTO catalog_cities (id, hash, meta, at) VALUES (?, ?, ?, ?)', [city.id, hash, JSON.stringify(meta), now()]);
  const placeRow = db.prepareSync('INSERT OR IGNORE INTO catalog_places (city_id, id, ord, name, lat, lng, duration, cost, wheelchair, hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const activityRow = db.prepareSync('INSERT OR IGNORE INTO catalog_place_activities (city_id, place_id, activity_id) VALUES (?, ?, ?)');
  try {
    places.forEach((p, ord) => {
      placeRow.executeSync([city.id, p.id, ord, p.name, p.lat, p.lng, p.duration ?? null, p.cost ?? null, p.wheelchair ?? null, p.hours ?? null]);
      for (const activity of p.activities) activityRow.executeSync([city.id, p.id, activity]);
    });
  } finally {
    placeRow.finalizeSync();
    activityRow.finalizeSync();
  }
}

/** Saves a downloaded city, or with no hash a bundled one, in place of what the device had. */
export function saveCatalogCity(city: City, hash: string | null): void {
  db.withTransactionSync(() => writeCity(city, hash));
}

/** Every city on the device, without places. A null hash means it came with the app. */
export function loadCatalogCities(): { meta: CityMeta; hash: string | null }[] {
  const rows = db.getAllSync<{ meta: string; hash: string | null }>('SELECT meta, hash FROM catalog_cities ORDER BY id');
  return rows.map((r) => ({ meta: JSON.parse(r.meta) as CityMeta, hash: r.hash }));
}

type PlaceRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  duration: string | null;
  cost: string | null;
  wheelchair: string | null;
  hours: string | null;
  activities: string | null;
};

const PLACE_COLUMNS = `p.id, p.name, p.lat, p.lng, p.duration, p.cost, p.wheelchair, p.hours,
  (SELECT group_concat(a.activity_id, ',') FROM catalog_place_activities a WHERE a.city_id = p.city_id AND a.place_id = p.id) AS activities`;

function toPlace(r: PlaceRow): Place {
  const place: Place = { id: r.id, name: r.name, lat: r.lat, lng: r.lng, activities: r.activities ? r.activities.split(',') : [] };
  if (r.duration) place.duration = r.duration as Place['duration'];
  if (r.cost) place.cost = r.cost as Place['cost'];
  if (r.wheelchair) place.wheelchair = r.wheelchair as Place['wheelchair'];
  if (r.hours) place.hours = r.hours;
  return place;
}

/** All of a city's places, in the catalog's order. */
export function loadCatalogPlaces(cityId: string): Place[] {
  return db.getAllSync<PlaceRow>(`SELECT ${PLACE_COLUMNS} FROM catalog_places p WHERE p.city_id = ? ORDER BY p.ord`, [cityId]).map(toPlace);
}

export type Box = { south: number; west: number; north: number; east: number };

/** A city's places inside a box, read through the position index. */
export function placesInBox(cityId: string, box: Box): Place[] {
  return db
    .getAllSync<PlaceRow>(
      `SELECT ${PLACE_COLUMNS} FROM catalog_places p
       WHERE p.city_id = ? AND p.lat BETWEEN ? AND ? AND p.lng BETWEEN ? AND ? ORDER BY p.ord`,
      [cityId, box.south, box.north, box.west, box.east],
    )
    .map(toPlace);
}

/** A city's places for one activity, plus any others asked for by id. */
export function placesFor(cityId: string, activityId: string, placeIds: string[] = []): Place[] {
  return db
    .getAllSync<PlaceRow>(
      `SELECT ${PLACE_COLUMNS} FROM catalog_places p WHERE p.city_id = ? AND (
         p.id IN (SELECT place_id FROM catalog_place_activities WHERE city_id = ? AND activity_id = ?)
         OR p.id IN (${placeIds.map(() => '?').join(', ')})
       ) ORDER BY p.ord`,
      [cityId, cityId, activityId, ...placeIds],
    )
    .map(toPlace);
}

/** The cities that have a place, since history keeps place ids but not cities. */
export function citiesWithPlace(placeId: string): string[] {
  return db.getAllSync<{ city_id: string }>('SELECT city_id FROM catalog_places WHERE id = ?', [placeId]).map((r) => r.city_id);
}

// Sync plugs in here. Every table in SYNCED_TABLES is a log of rows with a global id, or for custom activities one row
// per activity where the newer one wins. Pushing is "everything after my cursor", pulling is "add what I don't have",
// and both are safe to repeat.

export type Changes = Record<SyncedTable, Row[]>;
/** How far this phone's changes have been sent, per table. */
export type SyncCursor = Partial<Record<SyncedTable, number>>;

const tables = () => Object.entries(SYNCED_TABLES) as [SyncedTable, readonly string[]][];

/**
 * Rows made or changed on this phone after the cursor, and the cursor to save once they are sent.
 * Rows pulled from other devices show up here too. Sending them back is harmless, since every write is by id.
 */
export function changesSince(cursor: SyncCursor = {}): { changes: Changes; cursor: SyncCursor } {
  const changes = {} as Changes;
  const next: SyncCursor = {};
  for (const [table, columns] of tables()) {
    const rows = db.getAllSync<Row>(`SELECT seq, ${columns.join(', ')} FROM ${table} WHERE seq > ? ORDER BY seq`, [cursor[table] ?? 0]);
    next[table] = rows.length ? Number(rows[rows.length - 1].seq) : (cursor[table] ?? 0);
    changes[table] = rows.map(({ seq: _seq, ...row }) => row);
  }
  return { changes, cursor: next };
}

/**
 * Adds rows from another device or a backup. A row already here is skipped, and a custom activity only
 * replaces an older version of itself. Returns how many rows were new.
 */
export function applyChanges(changes: Partial<Record<SyncedTable, unknown[]>>): number {
  let added = 0;
  db.withTransactionSync(() => {
    for (const [table, columns] of tables()) {
      const incoming = (changes[table] ?? []).map((r) => pick(r, columns));
      if (!incoming.length) continue;
      const placeholders = columns.map(() => '?').join(', ');
      const legacy = incoming.some((r) => r.id == null) ? contentKeys(table) : null;
      for (const row of incoming) {
        row.device_id ??= deviceId();
        if (row.id == null) {
          // A backup from before version 7 has no ids, so a row counts as already here when everything else matches.
          const key = contentKey(table, row);
          if (legacy!.has(key)) continue;
          legacy!.add(key);
          row.id = newId();
        }
        const values = columns.map((c) => row[c]);
        if (table === 'custom_activities') {
          const existing = db.getFirstSync<{ at: string }>('SELECT at FROM custom_activities WHERE id = ?', [row.id]);
          if (existing && existing.at >= row.at!) continue;
          db.runSync(`INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
          added++;
          continue;
        }
        added += db.runSync(`INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values).changes;
      }
    }
  });
  return added;
}

const contentColumns = (table: SyncedTable) => SYNCED_TABLES[table].filter((c) => c !== 'id' && c !== 'device_id');
const contentKey = (table: SyncedTable, row: Row) => JSON.stringify(contentColumns(table).map((c) => row[c] ?? null));

function contentKeys(table: SyncedTable): Set<string> {
  const rows = db.getAllSync<Row>(`SELECT ${contentColumns(table).join(', ')} FROM ${table}`);
  return new Set(rows.map((r) => contentKey(table, r)));
}

// Backups carry the synced tables and a few settings. Drive times and downloaded cities are caches that refill on their own.
// Settings only fill in what the phone doesn't have yet. The weekend nudge and the device id belong to each phone.
const FILLED_SETTINGS = ['homeLocation', 'trip', 'recentPlaces', 'cityChoice', 'cityRangeKm', 'exploreFilters', 'onboarded', 'planAddsToCalendar', 'swipeNudged'];

/** Everything the user made, in the shape of the current schema. */
export type UserData = {
  schema: number;
  tables: Partial<Changes>;
  settings: Record<string, unknown>;
};

export function exportUserData(): UserData {
  const settings: Record<string, unknown> = {};
  for (const key of FILLED_SETTINGS) {
    const value = readSetting<unknown>(key, undefined);
    if (value !== undefined) settings[key] = value;
  }
  return { schema: schemaVersion(), tables: changesSince().changes, settings };
}

function schemaVersion(): number {
  return db.getFirstSync<{ user_version: number }>('PRAGMA user_version')!.user_version;
}

/** Adds a backup's rows to what's on the phone, so restoring never loses anything newer. Returns how many rows were new. */
export function mergeUserData(data: UserData): number {
  // A migration that changes stored ids has to upgrade older backups here before they merge.
  if (data.schema > schemaVersion()) throw new Error('This backup is from a newer version of the app. Update the app, then try again.');
  const added = applyChanges(data.tables);
  // Before version 7, saved and hidden ideas were plain lists. One that this phone has no record of goes on its list.
  for (const [list, key] of [
    ['saved', 'savedIds'],
    ['hidden', 'hiddenIds'],
  ] as const) {
    const ids = data.settings[key];
    if (!Array.isArray(ids)) continue;
    for (const id of new Set(ids.map(String))) {
      if (!db.getFirstSync('SELECT 1 FROM list_events WHERE list = ? AND entry_id = ?', [list, id])) recordListChange(list, id, true);
    }
  }
  for (const key of FILLED_SETTINGS) {
    if (data.settings[key] !== undefined && readSetting<unknown>(key, undefined) === undefined) writeSetting(key, data.settings[key]);
  }
  // The backup may predate a catalog rename, so aliases run again over the merged rows.
  writeSetting('appliedAliases', '');
  return added;
}

/** Only known columns, and only values SQLite can store as they are. */
function pick(row: unknown, columns: readonly string[]): Row {
  if (!row || typeof row !== 'object') throw new Error('This backup is damaged.');
  const source = row as Record<string, unknown>;
  const picked: Row = {};
  for (const c of columns) {
    const value = source[c] ?? null;
    if (value !== null && typeof value !== 'string' && typeof value !== 'number') throw new Error('This backup is damaged.');
    picked[c] = value;
  }
  if (typeof picked.at !== 'string') throw new Error('This backup is damaged.');
  return picked;
}
