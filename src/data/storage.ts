import { openDatabaseSync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';

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
`);

export function loadDoneIds(): Set<string> {
  const rows = db.getAllSync<{ activity_id: string }>(`
    SELECT e.activity_id FROM completion_events e
    WHERE e.id = (SELECT MAX(id) FROM completion_events WHERE activity_id = e.activity_id)
      AND e.done = 1
  `);
  return new Set(rows.map((r) => r.activity_id));
}

export function recordCompletion(activityId: string, done: boolean): void {
  db.runSync('INSERT INTO completion_events (activity_id, done, at) VALUES (?, ?, ?)', [
    activityId,
    done ? 1 : 0,
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
