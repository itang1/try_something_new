import type { Session } from '@supabase/supabase-js';
import { describeSession } from '@/data/account';
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
