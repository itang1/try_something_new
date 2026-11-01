import type { Entry, Place } from '@/data/catalog';
import { directionsUrl } from '@/data/directions';
import { driveMinutes, estimateMinutes, formatMinutes, haversineKm, placesByDistance } from '@/data/drive';

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
    const times = { mode: 'drive' as const, minutes: new Map([['near', 12], ['far', 40]]) };
    expect(driveMinutes(entry, origin, times)).toBe(12);
  });

  it('estimates walking, cycling and transit from the distance', () => {
    expect(estimateMinutes(9, 'walk')).toBe(120);
    expect(estimateMinutes(7, 'bike')).toBe(30);
    // Transit pays for getting to the stop, so a short trip is a walk and a long one is quicker than walking.
    expect(estimateMinutes(0.5, 'transit')).toBe(estimateMinutes(0.5, 'walk'));
    expect(estimateMinutes(9, 'transit')).toBe(42);
  });

  it('estimates in the travel mode when there is no real time', () => {
    const walking = { mode: 'walk' as const, minutes: new Map([['near', 12]]) };
    expect(placesByDistance(entry, origin, walking).map((r) => r.minutes)).toEqual([12, 667]);
  });

  it('opens directions in the travel mode', () => {
    const p = place('p', 34, -118);
    expect(directionsUrl(p, 'walk', 'ios')).toContain('dirflg=w');
    expect(directionsUrl(p, 'bike', 'ios')).not.toContain('dirflg');
    expect(directionsUrl(p, 'transit', 'android')).toContain('travelmode=transit');
    expect(directionsUrl(p, 'bike', 'android')).toContain('travelmode=bicycling');
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
