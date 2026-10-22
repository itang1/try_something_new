import { openDatabaseSync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import type { CustomActivity } from './catalog';

const db = openDatabaseSync('app.db');

// Completions are an append-only log, so history survives and syncing later only has to send new rows.
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

// Each step runs once, when stored ids or kinds change shape.
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
      db.runSync('DELETE FROM drive_times WHERE place_id = ?', [from]);
    }
  });
  for (const list of ['savedIds', 'hiddenIds']) {
    writeSetting(list, [...new Set(readSetting<string[]>(list, []).map((id) => aliases[id] ?? id))]);
  }
  writeSetting('appliedAliases', key);
}

export function loadDoneIds(): Set<string> {
  const rows = db.getAllSync<{ activity_id: string }>(`
    SELECT e.activity_id FROM completion_events e
    WHERE e.id = (SELECT MAX(id) FROM completion_events WHERE activity_id = e.activity_id)
      AND e.done = 1
  `);
  return new Set(rows.map((r) => r.activity_id));
}

/** Earlier means done before using the app: it counts as done but isn't a memory. */
export function recordCompletion(activityId: string, done: boolean, earlier = false): void {
  db.runSync('INSERT INTO completion_events (activity_id, done, earlier, at) VALUES (?, ?, ?, ?)', [
    activityId,
    done ? 1 : 0,
    earlier ? 1 : 0,
    new Date().toISOString(),
  ]);
}

export function loadVisitedPlaceIds(): Set<string> {
  const rows = db.getAllSync<{ place_id: string }>(`
    SELECT v.place_id FROM place_visits v
    WHERE v.id = (SELECT MAX(id) FROM place_visits WHERE place_id = v.place_id)
      AND v.visited = 1
  `);
  return new Set(rows.map((r) => r.place_id));
}

/** Same append-only shape as completions. The activity is kept so a visit can be credited to it later. */
export function recordVisit(placeId: string, activityId: string, visited: boolean): void {
  db.runSync('INSERT INTO place_visits (place_id, activity_id, visited, at) VALUES (?, ?, ?, ?)', [
    placeId,
    activityId,
    visited ? 1 : 0,
    new Date().toISOString(),
  ]);
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
  db.runSync('INSERT INTO reflections (entry_id, place_id, place_name, rating, note, photo, at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    r.entryId,
    r.placeId,
    r.placeName,
    r.rating,
    r.note || null,
    r.photo,
    new Date().toISOString(),
  ]);
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
    LEFT JOIN reflections r ON r.id = (SELECT MAX(id) FROM reflections WHERE entry_id = c.activity_id)
    WHERE c.id = (SELECT MAX(id) FROM completion_events WHERE activity_id = c.activity_id)
      AND c.done = 1 AND c.earlier = 0
    ORDER BY c.at DESC
  `);
}

export function loadCustomActivities(): CustomActivity[] {
  return db.getAllSync<CustomActivity>(`
    SELECT id, city_id AS cityId, name, subcategory, duration, cost FROM custom_activities
    WHERE deleted = 0 ORDER BY at
  `);
}

export function saveCustomActivity(c: CustomActivity): void {
  db.runSync(
    'INSERT INTO custom_activities (id, city_id, name, subcategory, duration, cost, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [c.id, c.cityId, c.name, c.subcategory, c.duration, c.cost, new Date().toISOString()],
  );
}

/** Kept as a row so a later sync can tell other devices it was deleted. */
export function deleteCustomActivity(id: string): void {
  db.runSync('UPDATE custom_activities SET deleted = 1, at = ? WHERE id = ?', [new Date().toISOString(), id]);
}

/** A day is a local YYYY-MM-DD key. Activity ids repeat across cities, so plans are kept per city. */
export type Plan = { entryId: string; cityId: string; placeId: string | null; placeName: string | null; day: string };

export const planKey = (cityId: string, entryId: string) => `${cityId}/${entryId}`;

export function loadPlans(): Map<string, Plan> {
  const rows = db.getAllSync<{ entry_id: string; city_id: string; place_id: string | null; place_name: string | null; day: string }>(`
    SELECT p.entry_id, p.city_id, p.place_id, p.place_name, p.day FROM plans p
    WHERE p.id = (SELECT MAX(id) FROM plans WHERE city_id = p.city_id AND entry_id = p.entry_id)
      AND p.day IS NOT NULL
  `);
  return new Map(
    rows.map((r) => [
      planKey(r.city_id, r.entry_id),
      { entryId: r.entry_id, cityId: r.city_id, placeId: r.place_id, placeName: r.place_name, day: r.day },
    ]),
  );
}

/** Append-only like the other logs. A row with no day clears the plan. */
export function recordPlan(cityId: string, entryId: string, plan: Pick<Plan, 'placeId' | 'placeName' | 'day'> | null): void {
  db.runSync('INSERT INTO plans (entry_id, city_id, place_id, place_name, day, at) VALUES (?, ?, ?, ?, ?, ?)', [
    entryId,
    cityId,
    plan?.placeId ?? null,
    plan?.placeName ?? null,
    plan?.day ?? null,
    new Date().toISOString(),
  ]);
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

/** Downloaded city files, kept whole so a city works offline once it has been opened. */
export function loadCachedCity(id: string): { hash: string; json: string } | null {
  return db.getFirstSync<{ hash: string; json: string }>('SELECT hash, json FROM catalog_cities WHERE id = ?', [id]);
}

export function cachedCityHashes(): Map<string, string> {
  const rows = db.getAllSync<{ id: string; hash: string }>('SELECT id, hash FROM catalog_cities');
  return new Map(rows.map((r) => [r.id, r.hash]));
}

export function saveCachedCity(id: string, hash: string, json: string): void {
  db.runSync('INSERT OR REPLACE INTO catalog_cities (id, hash, json, at) VALUES (?, ?, ?, ?)', [
    id,
    hash,
    json,
    new Date().toISOString(),
  ]);
}
