import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';

// Only the project URL and the publishable key ship in the app; row-level security decides what each account sees.
// Both come from the environment (.env.local or EAS), so sync stays off until they are set.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null | undefined;

/** The Supabase client, or null when the app was built without the keys. */
export function supabase(): SupabaseClient | null {
  if (client === undefined) {
    client =
      URL && KEY
        ? createClient(URL, KEY, {
            auth: { storage: Storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
          })
        : null;
  }
  return client;
}
