import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { readSetting, writeSetting } from './storage';
import { supabase } from './supabase';
import { resetSync, supabaseRemote, sync } from './sync';

export type Provider = 'apple' | 'google';

/** Where the sign-in page sends the browser back to: the app's scheme from app.json. Listed in Supabase's Redirect URLs. */
export const AUTH_REDIRECT = 'trysomethingnew://auth-callback';
const LAST_SYNC = 'syncLastAt';

/** True when the app was built with the Supabase keys, so accounts can be offered at all. */
export const accountsAvailable = () => supabase() != null;

/**
 * Signs in and returns the session, or null when the person backed out.
 * On iOS, Apple uses the system sheet. Google, and Apple on Android, open the provider's page in a browser.
 */
export async function signIn(provider: Provider): Promise<Session | null> {
  const client = supabase();
  if (!client) throw new Error('Accounts aren’t set up in this build.');
  if (provider === 'apple' && Platform.OS === 'ios') return signInWithAppleSheet();

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
  if (result.type !== 'success') return null;

  const params = Linking.parse(result.url).queryParams ?? {};
  const code = typeof params.code === 'string' ? params.code : null;
  if (!code) {
    const reason = params.error_description ?? params.error;
    throw new Error(typeof reason === 'string' ? reason : 'Sign-in didn’t finish.');
  }
  const exchanged = await client.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw new Error(exchanged.error.message);
  return exchanged.data.session;
}

async function signInWithAppleSheet(): Promise<Session | null> {
  const client = supabase()!;
  // Apple gets the hash of a one-time value and Supabase the value itself, so a stolen token can't be replayed.
  const nonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
  } catch (e) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple didn’t return a sign-in token.');
  const { data, error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });
  if (error) throw new Error(error.message);
  return data.session;
}

let inFlight: Promise<{ pushed: number; pulled: number }> | null = null;

/** Sends this phone's changes and adds the account's changes from other devices. A sync already running is shared. */
export function syncNow(): Promise<{ pushed: number; pulled: number }> {
  inFlight ??= (async () => {
    try {
      const client = supabase();
      if (!client) throw new Error('Accounts aren’t set up in this build.');
      const result = await sync(supabaseRemote(client));
      writeSetting(LAST_SYNC, new Date().toISOString());
      return result;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** When the app comes back to the front, it syncs again only if the last sync is older than this. */
export const AUTO_SYNC_GAP_MS = 5 * 60 * 1000;

/**
 * Whether to sync on its own: always on launch and when the app goes to the background (so changes leave the phone),
 * and on coming back only after a few minutes, so switching apps doesn't sync every time.
 */
export function shouldAutoSync(moment: 'launch' | 'active' | 'background', last: string | null, now = Date.now()): boolean {
  if (moment !== 'active' || !last) return true;
  return now - Date.parse(last) >= AUTO_SYNC_GAP_MS;
}

export const lastSyncedAt = (): string | null => readSetting<string | null>(LAST_SYNC, null);

/** Signs out on this phone. Everything stays here; the next account starts syncing from scratch. */
export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut({ scope: 'local' });
  resetSync();
  writeSetting(LAST_SYNC, null);
}

/** Deletes the account and everything synced to it, then signs out. The phone keeps its own copy. */
export async function deleteAccount(): Promise<void> {
  const client = supabase();
  if (!client) return;
  const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error(error.message);
  await signOut();
}

/** The signed-in session, kept current as the person signs in and out. Undefined while it loads. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(() => (accountsAvailable() ? undefined : null));
  useEffect(() => {
    const client = supabase();
    if (!client) return;
    let live = true;
    client.auth.getSession().then(({ data }) => live && setSession(data.session));
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return session;
}

/** The provider and address to show for a session, e.g. "Apple · name@privaterelay.appleid.com". */
export function describeSession(session: Session): string {
  const provider = session.user.app_metadata?.provider;
  const name = provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : null;
  const email = session.user.email;
  return [name, email].filter(Boolean).join(' · ') || 'Signed in';
}
