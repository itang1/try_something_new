import { placesUrl, suggestionFrom, suggestionsFrom } from '../src/data/places';
import { parsePlacesQuery, photonUrl, trimPhoton } from '../server/drive-times/places';

const feature = (properties: Record<string, string>, coordinates: unknown = [-118.14, 34.15]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties,
});

describe('places: suggestions from Photon', () => {
  it('names a US town with its state', () => {
    const s = suggestionFrom(feature({ type: 'city', name: 'Pasadena', state: 'California', country: 'United States', countrycode: 'US', osm_key: 'place' }));
    expect(s).toMatchObject({ kind: 'town', title: 'Pasadena', detail: 'California', name: 'Pasadena, CA', latitude: 34.15, longitude: -118.14 });
  });

  it('names a town abroad with its country', () => {
    const s = suggestionFrom(feature({ type: 'city', name: 'Kyoto', state: 'Kyoto Prefecture', country: 'Japan', countrycode: 'JP' }));
    expect(s).toMatchObject({ title: 'Kyoto', detail: 'Kyoto Prefecture, Japan', name: 'Kyoto, Japan' });
  });

  it('writes the house number first in the US and after the street elsewhere', () => {
    const us = suggestionFrom(
      feature({ type: 'house', housenumber: '100', street: 'Colorado Blvd', city: 'Pasadena', postcode: '91101', state: 'California', countrycode: 'US', osm_key: 'building' }),
    );
    expect(us).toMatchObject({ kind: 'address', title: '100 Colorado Blvd', detail: 'Pasadena, 91101, California', name: '100 Colorado Blvd, Pasadena' });
    const de = suggestionFrom(feature({ type: 'house', housenumber: '5', street: 'Hauptstraße', city: 'Berlin', country: 'Germany', countrycode: 'DE' }));
    expect(de).toMatchObject({ title: 'Hauptstraße 5', name: 'Hauptstraße 5, Berlin' });
  });

  it('names a hotel or other spot with its street and town', () => {
    const s = suggestionFrom(
      feature({ type: 'house', name: 'The Langham', housenumber: '1401', street: 'S Oak Knoll Ave', city: 'Pasadena', state: 'California', countrycode: 'US', osm_key: 'tourism', osm_value: 'hotel' }),
    );
    expect(s).toMatchObject({ kind: 'place', title: 'The Langham', detail: '1401 S Oak Knoll Ave, Pasadena, California', name: 'The Langham, Pasadena' });
  });

  it('names a street with its town', () => {
    const s = suggestionFrom(feature({ type: 'street', name: 'Lake Ave', city: 'Pasadena', state: 'California', countrycode: 'US', osm_key: 'highway' }));
    expect(s).toMatchObject({ kind: 'street', title: 'Lake Ave', name: 'Lake Ave, Pasadena' });
  });

  it('skips countries, states and malformed rows, and drops repeats', () => {
    expect(suggestionFrom(feature({ type: 'state', name: 'California', countrycode: 'US' }))).toBeNull();
    expect(suggestionFrom(feature({ type: 'country', name: 'France' }))).toBeNull();
    expect(suggestionFrom(feature({ type: 'city', name: 'Nowhere' }, ['x', 1]))).toBeNull();
    expect(suggestionFrom(feature({ type: 'city' }))).toBeNull();
    const town = feature({ type: 'city', name: 'Pasadena', state: 'California', countrycode: 'US' });
    expect(suggestionsFrom({ features: [town, town, feature({ type: 'country', name: 'X' })] })).toHaveLength(1);
    expect(suggestionsFrom(null)).toEqual([]);
    expect(suggestionsFrom({ features: 'nope' })).toEqual([]);
  });
});

describe('places: where the app asks', () => {
  it('uses the Worker when there is one, with a rough area', () => {
    const url = new URL(placesUrl(' pasa  dena ', { latitude: 34.1478, longitude: -118.1445 }, 'https://drive.example.workers.dev', false)!);
    expect(url.origin + url.pathname).toBe('https://drive.example.workers.dev/places');
    expect(url.searchParams.get('q')).toBe('pasa dena');
    expect(url.searchParams.get('lat')).toBe('34.1');
    expect(url.searchParams.get('lon')).toBe('-118.1');
  });

  it('calls Photon directly only in development, and never for short text', () => {
    expect(placesUrl('Pasadena', null, undefined, true)).toMatch(/^https:\/\/photon\.komoot\.io\/api\/\?/);
    expect(placesUrl('Pasadena', null, undefined, false)).toBeNull();
    expect(placesUrl('pa', null, 'https://drive.example.workers.dev', false)).toBeNull();
  });
});

describe('places: the Worker', () => {
  it('reads the query and rounds the area', () => {
    expect(parsePlacesQuery(new URL('https://w.dev/places?q=%20Pasadena%20&lat=34.147&lon=-118.144'))).toEqual({ q: 'Pasadena', bias: [34.1, -118.1] });
    expect(parsePlacesQuery(new URL('https://w.dev/places?q=Pasadena&lat=999&lon=1'))).toEqual({ q: 'Pasadena', bias: null });
    expect(parsePlacesQuery(new URL('https://w.dev/places?q=Pasadena'))).toEqual({ q: 'Pasadena', bias: null });
    expect(parsePlacesQuery(new URL('https://w.dev/places?q=pa'))).toBeNull();
    expect(parsePlacesQuery(new URL(`https://w.dev/places?q=${'a'.repeat(101)}`))).toBeNull();
  });

  it('builds the Photon request', () => {
    const url = new URL(photonUrl({ q: 'Pasadena', bias: [34.1, -118.1] }));
    expect(url.searchParams.get('q')).toBe('Pasadena');
    expect(url.searchParams.get('lat')).toBe('34.1');
    expect(url.searchParams.get('lon')).toBe('-118.1');
    expect(url.searchParams.get('lang')).toBe('en');
  });

  it('keeps only the point and naming properties', () => {
    const trimmed = trimPhoton({
      features: [
        { geometry: { coordinates: [-118.14, 34.15] }, properties: { name: 'Pasadena', type: 'city', osm_id: 123, extent: [1, 2, 3, 4], countrycode: 'US' } },
        { geometry: { coordinates: ['bad'] }, properties: {} },
        null,
      ],
    });
    expect(trimmed.features).toEqual([
      { type: 'Feature', geometry: { type: 'Point', coordinates: [-118.14, 34.15] }, properties: { name: 'Pasadena', type: 'city', countrycode: 'US' } },
    ]);
    expect(trimPhoton(null).features).toEqual([]);
    // What the Worker sends, the app reads.
    expect(suggestionsFrom(trimmed)).toHaveLength(1);
  });
});
