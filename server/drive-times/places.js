// Town and address suggestions for the app's location search, from Photon (https://photon.komoot.io), a free geocoder
// built on OpenStreetMap. Proxied here so the app never talks to Photon directly: Photon sees only the typed text and a
// rough area, never the phone's IP address, and nearby people typing the same thing share one cached answer.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const MAX_RESULTS = 8;
const CACHE_SECONDS = 7 * 86400;
// Only what the app uses to name a place. Photon also sends ids, extents and tags the app has no use for.
const KEEP = ['name', 'housenumber', 'street', 'postcode', 'city', 'district', 'locality', 'county', 'state', 'country', 'countrycode', 'type', 'osm_key', 'osm_value'];

/** Rounded to about 10 km: enough to rank nearby matches first without saying where someone is. */
const round1 = (x) => Math.round(x * 10) / 10;

/**
 * Reads ?q=&lat=&lon= from a request URL. Returns null when the text is too short or too long to search.
 * @param {URL} url
 * @returns {{ q: string, bias: [number, number] | null } | null}
 */
export function parsePlacesQuery(url) {
  const q = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g, ' ');
  if (q.length < 3 || q.length > 100) return null;
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  const valid = url.searchParams.has('lat') && url.searchParams.has('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return { q, bias: valid ? [round1(lat), round1(lon)] : null };
}

/**
 * The Photon request for a parsed query.
 * @param {{ q: string, bias: [number, number] | null }} query
 * @param {string} [base]
 */
export function photonUrl({ q, bias }, base = PHOTON_URL) {
  const url = new URL(base);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(MAX_RESULTS));
  url.searchParams.set('lang', 'en');
  if (bias) {
    url.searchParams.set('lat', String(bias[0]));
    url.searchParams.set('lon', String(bias[1]));
  }
  return url.toString();
}

/**
 * Keeps each feature's point and the few properties the app names places with, and drops anything malformed.
 * @param {unknown} body Photon's GeoJSON answer
 */
export function trimPhoton(body) {
  const features = Array.isArray(body?.features) ? body.features : [];
  return {
    type: 'FeatureCollection',
    features: features
      .filter((f) => Array.isArray(f?.geometry?.coordinates) && f.geometry.coordinates.length >= 2 && f.geometry.coordinates.every(Number.isFinite))
      .slice(0, MAX_RESULTS)
      .map((f) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: f.geometry.coordinates.slice(0, 2) },
        properties: Object.fromEntries(
          KEEP.filter((k) => typeof f.properties?.[k] === 'string').map((k) => [k, f.properties[k].slice(0, 120)]),
        ),
      })),
  };
}

/** GET /places?q=<text>&lat=<lat>&lon=<lon>, with lat and lon optional. */
export async function suggestPlaces(request, env, ctx) {
  if (env.PLACES_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.PLACES_LIMITER.limit({ key: ip });
    if (!success) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } });
  }
  const query = parsePlacesQuery(new URL(request.url));
  if (!query) return new Response('Expected q with 3 to 100 characters', { status: 400 });

  const key = new Request(`https://places.cache/${encodeURIComponent(query.q.toLowerCase())}/${query.bias?.join(',') ?? 'any'}`);
  const cached = await caches.default.match(key);
  if (cached) return cached;

  const upstream = await fetch(photonUrl(query, env.PHOTON_URL || PHOTON_URL), {
    headers: { 'User-Agent': 'TrySomethingNew/1.0 (location search proxy)' },
  }).catch(() => null);
  if (!upstream?.ok) return new Response('Search failed', { status: 502 });
  const body = await upstream.json().catch(() => null);
  const response = Response.json(trimPhoton(body), { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } });
  ctx.waitUntil(caches.default.put(key, response.clone()));
  return response;
}
