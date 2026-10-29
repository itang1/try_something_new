import type { Entry, Place } from '@/data/catalog';
import { driveMinutes, formatMinutes, haversineKm, placesByDistance } from '@/data/drive';

const origin = { latitude: 34.05, longitude: -118.25 };
const place = (id: string, lat: number, lng: number): Place => ({ id, name: id, lat, lng, activities: [] });
const near = place('near', 34.06, -118.25);
const far = place('far', 34.5, -118.25);
const entry = { places: [far, near] } as Entry;

describe('drive', () => {
  it('measures great-circle distance', () => {
    // A tenth of a degree of latitude is about 11 km.
    expect(haversineKm(origin, 34.15, -118.25)).toBeCloseTo(11.1, 1);
  });

  it('estimates minutes at about 50 km/h, never below one', () => {
    expect(driveMinutes(entry, origin)).toBe(1);
    expect(driveMinutes(entry, null)).toBeNull();
  });

  it('prefers real drive times over the estimate', () => {
    const times = new Map([['near', 12], ['far', 40]]);
    expect(driveMinutes(entry, origin, times)).toBe(12);
  });

  it('sorts places nearest first only when there is an origin', () => {
    expect(placesByDistance(entry, origin).map((r) => r.place.id)).toEqual(['near', 'far']);
    expect(placesByDistance(entry, null).map((r) => r.place.id)).toEqual(['far', 'near']);
  });

  it('formats minutes and hours', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(95)).toBe('1 hr 35 min');
  });
});
