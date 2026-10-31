import { ANALYTICS_SETTING, appOpened, daysSinceInstall, firstOpenDay, track } from '@/data/analytics';
import { supabase } from '@/data/supabase';

const mockSettings = new Map<string, unknown>();
jest.mock('@/data/storage', () => ({
  readSetting: (key: string, fallback: unknown) => (mockSettings.has(key) ? mockSettings.get(key) : fallback),
  writeSetting: (key: string, value: unknown) => mockSettings.set(key, JSON.parse(JSON.stringify(value))),
}));
jest.mock('@/data/supabase', () => ({ supabase: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.2.3' } } }));

const insert = jest.fn();
const from = jest.fn(() => ({ insert }));
const g = globalThis as { __DEV__?: boolean };
const dev = g.__DEV__;

beforeAll(() => {
  g.__DEV__ = false;
});
afterAll(() => {
  g.__DEV__ = dev;
});

beforeEach(() => {
  mockSettings.clear();
  insert.mockReset().mockReturnValue(Promise.resolve({ error: null }));
  from.mockClear();
  jest.mocked(supabase).mockReset().mockReturnValue({ from } as never);
});

describe('first open', () => {
  it('is saved once and counted in calendar days', () => {
    expect(firstOpenDay(new Date(2026, 9, 1, 23, 30))).toBe('2026-10-01');
    expect(firstOpenDay(new Date(2026, 9, 9))).toBe('2026-10-01');
    expect(daysSinceInstall(new Date(2026, 9, 1, 23, 59))).toBe(0);
    expect(daysSinceInstall(new Date(2026, 9, 2, 0, 1))).toBe(1);
    expect(daysSinceInstall(new Date(2026, 10, 15, 12))).toBe(45);
  });

  it('never goes below zero', () => {
    mockSettings.set('firstOpenDay', '2030-01-01');
    expect(daysSinceInstall(new Date(2026, 0, 1))).toBe(0);
  });

  it('is saved on launch even with counts off', () => {
    appOpened();
    expect(mockSettings.has('firstOpenDay')).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('track', () => {
  it('sends nothing while off, which is the default', () => {
    track('plan_made');
    expect(supabase).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('sends only the event, platform, version and days when on', () => {
    mockSettings.set(ANALYTICS_SETTING, true);
    mockSettings.set('firstOpenDay', '2000-01-01');
    track('done_saved');
    expect(from).toHaveBeenCalledWith('app_events');
    const row = insert.mock.calls[0][0];
    expect(Object.keys(row).sort()).toEqual(['app_version', 'days_since_install', 'name', 'platform']);
    expect(row).toMatchObject({ name: 'done_saved', app_version: '1.2.3' });
    expect(['ios', 'android', 'other']).toContain(row.platform);
    expect(row.days_since_install).toBeGreaterThan(9000);
  });

  it('does nothing without Supabase keys', () => {
    mockSettings.set(ANALYTICS_SETTING, true);
    jest.mocked(supabase).mockReturnValue(null);
    expect(() => track('app_open')).not.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it('never throws or rejects when sending fails', async () => {
    mockSettings.set(ANALYTICS_SETTING, true);
    insert.mockReturnValue(Promise.reject(new Error('offline')));
    expect(() => track('card_shared')).not.toThrow();
    insert.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => track('invite_sent')).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('sends nothing in development builds', () => {
    mockSettings.set(ANALYTICS_SETTING, true);
    g.__DEV__ = true;
    track('app_open');
    g.__DEV__ = false;
    expect(insert).not.toHaveBeenCalled();
  });
});
