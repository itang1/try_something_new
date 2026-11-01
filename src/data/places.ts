import type { Coordinate } from './drive';
import type { HomeLocation } from '@/state/app-state';

// Town and address suggestions come from Photon (OpenStreetMap), through the drive-time Worker's GET /places so the
// phone never talks to Photon itself. Without the Worker, development builds call Photon directly; release builds
// without it just skip suggestions and use the phone's geocoder.
const ROUTING_URL = process.env.EXPO_PUBLIC_ROUTING_URL;
const PHOTON_URL = 'https://photon.komoot.io/api/';

export type PlaceKind = 'address' | 'street' | 'town' | 'place';

export type PlaceSuggestion = HomeLocation & {
  /** Unique within one list of suggestions. */
  key: string;
  title: string;
  detail: string;
  kind: PlaceKind;
};

type PhotonProps = Partial<
  Record<
    | 'name'
    | 'housenumber'
    | 'street'
    | 'postcode'
    | 'city'
    | 'district'
    | 'locality'
    | 'county'
    | 'state'
    | 'country'
    | 'countrycode'
    | 'type'
    | 'osm_key'
    | 'osm_value',
    string
  >
>;
type PhotonFeature = { geometry?: { coordinates?: unknown }; properties?: PhotonProps };

const US_STATES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT',
  Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT',
  Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'Puerto Rico': 'PR',
};

// Countries that write the house number before the street.
const NUMBER_FIRST = new Set(['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'FR', 'PH']);
const TOWN_TYPES = new Set(['city', 'locality', 'district', 'county']);
const SKIPPED_TYPES = new Set(['country', 'state']);

const join = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(', ');

/** The state in the US, otherwise the region and country: enough to tell two Springfields apart. */
function regionOf(p: PhotonProps): string {
  if (p.countrycode?.toUpperCase() === 'US') return p.state ?? 'United States';
  return join(p.state, p.country);
}

/** The short region for a saved name, like "CA" or "Japan". */
function shortRegion(p: PhotonProps): string | undefined {
  if (p.countrycode?.toUpperCase() === 'US') return (p.state && US_STATES[p.state]) || p.state;
  return p.country;
}

function streetLine(p: PhotonProps): string | undefined {
  if (!p.street) return undefined;
  if (!p.housenumber) return p.street;
  return NUMBER_FIRST.has(p.countrycode?.toUpperCase() ?? '') ? `${p.housenumber} ${p.street}` : `${p.street} ${p.housenumber}`;
}

/** Turns one Photon feature into a suggestion, or null for whole countries, states and malformed rows. */
export function suggestionFrom(feature: PhotonFeature, index = 0): PlaceSuggestion | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [longitude, latitude] = coords as number[];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const p = feature.properties ?? {};
  if (p.type && SKIPPED_TYPES.has(p.type)) return null;
  const town = p.city ?? p.locality ?? p.district ?? p.county;
  const short = shortRegion(p);

  let kind: PlaceKind;
  let title: string | undefined;
  let detail: string;
  let name: string;
  if (p.type && TOWN_TYPES.has(p.type)) {
    kind = 'town';
    title = p.name;
    detail = join(p.type !== 'city' && p.type !== 'county' && p.city !== p.name && p.city, regionOf(p));
    name = join(p.name, short);
  } else if (p.type === 'street') {
    kind = 'street';
    title = p.name;
    detail = join(town, regionOf(p));
    name = join(p.name, town);
  } else if (p.name && p.osm_key !== 'place' && p.osm_key !== 'building') {
    // A hotel, park or other named spot.
    kind = 'place';
    title = p.name;
    detail = join(streetLine(p), town, regionOf(p));
    name = join(p.name, town);
  } else {
    kind = 'address';
    title = streetLine(p) ?? p.name;
    detail = join(p.postcode && !title?.includes(p.postcode) ? join(town, p.postcode) : town, regionOf(p));
    name = join(title, town);
  }
  if (!title || !name) return null;
  return { key: `${index}:${latitude},${longitude}`, title, detail, kind, name, latitude, longitude };
}

/** Every usable suggestion in a Photon (or proxied) answer, without repeats of the same name in the same spot. */
export function suggestionsFrom(body: unknown): PlaceSuggestion[] {
  const features = (body as { features?: unknown })?.features;
  if (!Array.isArray(features)) return [];
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  features.forEach((f, i) => {
    const s = suggestionFrom(f as PhotonFeature, i);
    if (!s) return;
    const dedupe = `${s.title}|${s.detail}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push(s);
  });
  return out;
}

/** Where to ask, or null when this build has no way to. Exported for tests. */
export function placesUrl(query: string, near: Coordinate | null, routingUrl = ROUTING_URL, dev = __DEV__): string | null {
  const q = query.trim().replace(/\s+/g, ' ');
  if (q.length < 3) return null;
  let url: URL;
  if (routingUrl) {
    try {
      url = new URL('/places', routingUrl);
    } catch {
      return null;
    }
  } else if (dev) {
    url = new URL(PHOTON_URL);
    url.searchParams.set('limit', '8');
    url.searchParams.set('lang', 'en');
  } else {
    return null;
  }
  url.searchParams.set('q', q.slice(0, 100));
  if (near) {
    // Rounded to about 10 km on the phone, so only a rough area leaves it.
    url.searchParams.set('lat', (Math.round(near.latitude * 10) / 10).toString());
    url.searchParams.set('lon', (Math.round(near.longitude * 10) / 10).toString());
  }
  return url.toString();
}

/** Towns, streets, addresses and named places matching the text, nearest first when `near` is given. Empty on any failure. */
export async function searchPlaces(query: string, near: Coordinate | null, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = placesUrl(query, near);
  if (!url) return [];
  try {
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return [];
    return suggestionsFrom(await response.json());
  } catch {
    return [];
  }
}
