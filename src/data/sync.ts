import type { SupabaseClient } from '@supabase/supabase-js';
import { applyChanges, changesSince, readSetting, writeSetting, type SyncCursor, type SyncedTable } from './storage';

type Row = Record<string, unknown>;
/** Where the last pull stopped in one table: the server time and id of the last row read. */
type PullMark = { updatedAt: string; id: string };

const TABLES: SyncedTable[] = ['completion_events', 'place_visits', 'reflections', 'plans', 'custom_activities', 'list_events'];
const BOOLEANS = new Set(['done', 'earlier', 'visited', 'deleted', 'added']);
const PUSH_CURSOR = 'syncPushCursor';
const PULL_MARKS = 'syncPullMarks';
const PAGE = 500;
/** Each pull starts this far before the last mark, for rows another transaction committed late. Pulling twice is harmless. */
const OVERLAP_MS = 60_000;

/** The server's side of sync, so tests can stand in for Supabase. */
export type Remote = {
  push(table: SyncedTable, rows: Row[]): Promise<void>;
  /** Rows ordered by (updated_at, id), after the given mark. A mark with no id means from that time on. */
  pull(table: SyncedTable, after: PullMark | null, limit: number): Promise<Row[]>;
};

/** A phone row as the server stores it: real booleans, and no photo until photo backup sends the file. */
export function toServer(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[k] = BOOLEANS.has(k) ? Boolean(v) : v;
  if ('photo' in out) out.photo = null;
  return out;
}

/** A server row as the phone stores it: 0 and 1, and times in the phone's own format so "latest wins" compares right. */
export function fromServer(row: Row): Row {
  const { owner_id: _owner, updated_at: _updated, ...rest } = row;
  const out: Row = {};
  for (const [k, v] of Object.entries(rest)) out[k] = BOOLEANS.has(k) ? (v ? 1 : 0) : v;
  if (typeof out.at === 'string') out.at = new Date(out.at).toISOString();
  return out;
}

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async push(table, rows) {
      // Logs never change, so a row already there is skipped. A custom activity replaces an older version (the server keeps the newer one).
      const { error } = await client
        .from(table)
        .upsert(rows, { onConflict: 'owner_id,id', ignoreDuplicates: table !== 'custom_activities' });
      if (error) throw new Error(error.message);
    },
    async pull(table, after, limit) {
      let query = client.from(table).select('*').order('updated_at').order('id').limit(limit);
      if (after?.id) {
        query = query.or(`updated_at.gt."${after.updatedAt}",and(updated_at.eq."${after.updatedAt}",id.gt."${after.id}")`);
      } else if (after) {
        query = query.gte('updated_at', after.updatedAt);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  };
}

/**
 * Sends this phone's new rows, then adds the account's rows from other devices. Each table's cursor is saved
 * only after its step succeeds, so a failed sync simply resumes next time. Returns how many rows were new here.
 */
export async function sync(remote: Remote): Promise<{ pushed: number; pulled: number }> {
  const sent = readSetting<SyncCursor>(PUSH_CURSOR, {});
  const { changes, cursor } = changesSince(sent);
  let pushed = 0;
  for (const table of TABLES) {
    const rows = changes[table].map(toServer);
    for (let i = 0; i < rows.length; i += PAGE) await remote.push(table, rows.slice(i, i + PAGE));
    pushed += rows.length;
    sent[table] = cursor[table];
    writeSetting(PUSH_CURSOR, sent);
  }

  let pulled = 0;
  const marks = readSetting<Partial<Record<SyncedTable, PullMark>>>(PULL_MARKS, {});
  for (const table of TABLES) {
    const last = marks[table];
    let after: PullMark | null = last
      ? { updatedAt: new Date(new Date(last.updatedAt).getTime() - OVERLAP_MS).toISOString(), id: '' }
      : null;
    for (;;) {
      const page = await remote.pull(table, after, PAGE);
      if (!page.length) break;
      pulled += applyChanges({ [table]: page.map(fromServer) });
      const end = page[page.length - 1];
      after = { updatedAt: String(end.updated_at), id: String(end.id) };
      if (!last || new Date(after.updatedAt) >= new Date(last.updatedAt)) {
        marks[table] = after;
        writeSetting(PULL_MARKS, marks);
      }
      if (page.length < PAGE) break;
    }
  }
  return { pushed, pulled };
}

/** Forgets how far this phone has synced, for signing out or switching accounts. Local data stays. */
export function resetSync(): void {
  writeSetting(PULL_MARKS, {});
  writeSetting(PUSH_CURSOR, {});
}
