import { ANYWHERE_ID, AREA_KM, cityIdFor, cityIndex, RANGES, roughDrive } from '@/data/cities';

// Just enough storage for the city list: no downloaded cities and no saved settings.
jest.mock('@/data/storage', () => ({
  applyAliases: jest.fn(),
  citiesWithPlace: () => [],
  loadCatalogCities: () => [],
  loadCatalogPlaces: () => [],
  placesFor: () => [],
  placesInBox: () => [],
  readSetting: (_key: string, fallback: unknown) => fallback,
  saveCatalogCity: jest.fn(),
  writeSetting: jest.fn(),
}));

const pasadena = { latitude: 34.1478, longitude: -118.1445 };
// About 160 km from downtown Los Angeles, just past the default range.
const bakersfield = { latitude: 35.3733, longitude: -119.0187 };
const denver = { latitude: 39.7392, longitude: -104.9903 };

describe('cities', () => {
  it('knows every city before the index downloads', () => {
    expect(cityIndex().map((c) => c.id)).toEqual(['chicago', 'columbus', 'los-angeles', 'seattle', 'seoul']);
  });

  it('puts a neighboring town in the nearest city when it is within range', () => {
    expect(cityIdFor(pasadena)).toBe('los-angeles');
    expect(cityIdFor(bakersfield)).toBe(ANYWHERE_ID);
    expect(cityIdFor(bakersfield, 300)).toBe('los-angeles');
    expect(cityIdFor(pasadena, 5)).toBe(ANYWHERE_ID);
    expect(cityIdFor(denver, 300)).toBe(ANYWHERE_ID);
    expect(cityIdFor(null)).toBe(ANYWHERE_ID);
  });

  it('keeps the default range among the choices', () => {
    expect(RANGES.map((r) => r.km)).toContain(AREA_KM);
  });

  it('describes distances as rough drive times', () => {
    expect(roughDrive(5)).toBe('nearby');
    expect(roughDrive(30)).toBe('about 25 min');
    expect(roughDrive(160)).toBe('about 2 hr');
    expect(roughDrive(9000)).toBe('a flight away');
  });
});
