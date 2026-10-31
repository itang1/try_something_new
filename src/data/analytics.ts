import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { readSetting, writeSetting } from './storage';
import { supabase } from './supabase';

// Opt-in, anonymous usage counts, off by default. Each event is a row in Supabase's insert-only `app_events` table
// with an event name, the platform, the app version and how many days ago the app was first opened. No device id,
// account, location or anything about what someone did beyond the event's name. Enough to count activation and
// week 2 and 4 retention without following anyone.

/** The setting that turns counts on. Settings reads and writes it with useSetting. */
export const ANALYTICS_SETTING = 'shareUsageCounts';
const FIRST_OPEN_SETTING = 'firstOpenDay';

export type AppEvent = 'app_open' | 'plan_made' | 'done_saved' | 'memory_saved' | 'card_shared' | 'invite_sent';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A local calendar day as YYYY-MM-DD. */
function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The day the app was first opened, saved the first time it's asked for. Saved whether or not counts are on, so the
 * number is right if someone turns them on later.
 */
export function firstOpenDay(now = new Date()): string {
  const saved = readSetting<string | null>(FIRST_OPEN_SETTING, null);
  if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
  const today = dayKey(now);
  writeSetting(FIRST_OPEN_SETTING, today);
  return today;
}

/** Whole calendar days since the first open: 0 on that day, 7 a week later. */
export function daysSinceInstall(now = new Date()): number {
  const [y, m, d] = firstOpenDay(now).split('-').map(Number);
  const first = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Rounding absorbs the hour a daylight saving change adds or removes.
  return Math.min(100000, Math.max(0, Math.round((today - first) / DAY_MS)));
}

export function analyticsOn(): boolean {
  return readSetting<boolean>(ANALYTICS_SETTING, false) === true;
}

function platform(): 'ios' | 'android' | 'other' {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'other';
}

/**
 * Counts an event when the person has turned counts on and the app has Supabase keys. Fire and forget: it never
 * throws or waits, and a failed send is dropped. Development builds send nothing.
 */
export function track(name: AppEvent): void {
  try {
    if (__DEV__ || !analyticsOn()) return;
    const client = supabase();
    if (!client) return;
    const row = {
      name,
      platform: platform(),
      app_version: (Constants.expoConfig?.version ?? 'unknown').slice(0, 20),
      days_since_install: daysSinceInstall(),
    };
    // Insert only: the table can't be read back, so no .select() here.
    client
      .from('app_events')
      .insert(row)
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Counting must never get in the way of the app.
  }
}

let opened = false;

/** Notes the first open day and counts one app_open per launch. Call once from the root layout. */
export function appOpened(): void {
  if (opened) return;
  opened = true;
  try {
    firstOpenDay();
  } catch {
    // Storage not ready is no reason to stop the launch.
  }
  track('app_open');
}
