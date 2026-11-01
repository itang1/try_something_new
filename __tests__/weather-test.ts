import type { Entry } from '@/data/catalog';
import { fetchWeather, moodOf, poolForWeather, suitsMood } from '@/data/weather';

const mockSettings = new Map<string, unknown>();
jest.mock('@/data/storage', () => ({
  readSetting: (key: string, fallback: unknown) => (mockSettings.has(key) ? mockSettings.get(key) : fallback),
  writeSetting: (key: string, value: unknown) => void mockSettings.set(key, value),
}));

const entry = (fields: Partial<Entry>) => ({ id: 'x', places: [], ...fields }) as Entry;
const hike = entry({ id: 'hike', setting: 'outdoor' });
const museum = entry({ id: 'museum', setting: 'indoor' });
const kayak = entry({ id: 'kayak', setting: 'outdoor', home: undefined });
const bake = entry({ id: 'bake', home: 'An oven' });
const skate = entry({ id: 'skate', setting: 'outdoor', months: [11, 12, 1, 2] });

describe('weather-aware suggestions', () => {
  it('reads rain, heat and a hard freeze', () => {
    expect(moodOf(null)).toBeNull();
    expect(moodOf({ code: 0, tempC: 22, precipMm: 0 })).toBeNull();
    expect(moodOf({ code: 61, tempC: 12, precipMm: 1.2 })).toBe('wet');
    expect(moodOf({ code: 3, tempC: 12, precipMm: 0.6 })).toBe('wet');
    expect(moodOf({ code: 0, tempC: 38, precipMm: 0 })).toBe('hot');
    expect(moodOf({ code: 0, tempC: -9, precipMm: 0 })).toBe('cold');
  });

  it('keeps indoor, at-home and winter ideas for the weather', () => {
    expect(suitsMood(museum, 'wet')).toBe(true);
    expect(suitsMood(bake, 'hot')).toBe(true);
    expect(suitsMood(hike, 'wet')).toBe(false);
    expect(suitsMood(skate, 'cold')).toBe(true);
    expect(suitsMood(skate, 'wet')).toBe(false);
  });

  it('leans toward them on most picks without hiding the rest', () => {
    const pool = [hike, museum, kayak, bake];
    expect(poolForWeather(pool, null)).toBe(pool);
    expect(poolForWeather(pool, 'wet', () => 0.1).map((e) => e.id)).toEqual(['museum', 'bake']);
    expect(poolForWeather(pool, 'wet', () => 0.9)).toBe(pool);
    expect(poolForWeather([hike, kayak], 'wet', () => 0.1)).toEqual([hike, kayak]);
  });

  it('asks Open-Meteo with a rounded location, and caches the answer for an hour', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ current: { temperature_2m: 14.2, precipitation: 0.8, weather_code: 63 } }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const point = { latitude: 47.61234, longitude: -122.33456 };

    expect(await fetchWeather(point, undefined, 1000)).toEqual({ code: 63, tempC: 14.2, precipMm: 0.8 });
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('latitude=47.6&longitude=-122.3&');
    await fetchWeather(point, undefined, 1000 + 30 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fetchWeather(point, undefined, 1000 + 61 * 60 * 1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives no weather when offline', async () => {
    mockSettings.clear();
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchWeather({ latitude: 1, longitude: 2 })).toBeNull();
  });
});
