import type { Session } from '@supabase/supabase-js';
import { AUTO_SYNC_GAP_MS, describeSession, shouldAutoSync, syncNow } from '@/data/account';
import { redirectSystemPath } from '@/app/+native-intent';

jest.mock('@/data/storage', () => ({ readSetting: (_: string, fallback: unknown) => fallback, writeSetting: jest.fn() }));
jest.mock('@/data/supabase', () => ({ supabase: () => null }));

const session = (provider: string, email?: string) => ({ user: { app_metadata: { provider }, email } }) as unknown as Session;

test('names the provider and address of a session', () => {
  expect(describeSession(session('apple', 'a@privaterelay.appleid.com'))).toBe('Apple · a@privaterelay.appleid.com');
  expect(describeSession(session('google', 'me@gmail.com'))).toBe('Google · me@gmail.com');
  expect(describeSession(session('email'))).toBe('Signed in');
});

test('the router ignores the sign-in callback and keeps other links', () => {
  expect(redirectSystemPath({ path: 'trysomethingnew://auth-callback?code=abc', initial: false })).toBeNull();
  expect(redirectSystemPath({ path: '/settings', initial: false })).toBe('/settings');
});

test('syncs on its own on launch and going to the background, and on coming back only after a few minutes', () => {
  const now = Date.parse('2026-11-01T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  expect(shouldAutoSync('launch', ago(1000), now)).toBe(true);
  expect(shouldAutoSync('background', ago(1000), now)).toBe(true);
  expect(shouldAutoSync('active', ago(60_000), now)).toBe(false);
  expect(shouldAutoSync('active', ago(AUTO_SYNC_GAP_MS), now)).toBe(true);
  expect(shouldAutoSync('active', null, now)).toBe(true);
});

test('a sync without accounts set up fails, and the next one can still run', async () => {
  await expect(syncNow()).rejects.toThrow('set up');
  await expect(syncNow()).rejects.toThrow('set up');
});
