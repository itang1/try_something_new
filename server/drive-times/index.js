// A Cloudflare Worker that answers drive, walk and bike time requests for the app, so the OpenRouteService key never ships on phones
// and nearby people asking about the same places share one cached answer. GET /places also proxies town and address
// suggestions for the location search (see places.js), and POST /report files a place report as a GitHub issue (see report.js).
import { suggestPlaces } from './places.js';
import { reportPlace } from './report.js';

const MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/';
// The app's travel modes that OpenRouteService routes. Transit has no free router, so the app estimates it.
const PROFILES = { drive: 'driving-car', walk: 'foot-walking', bike: 'cycling-regular' };
const MAX_PLACES = 25;
const CACHE_SECONDS = 30 * 86400;

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/places') return suggestPlaces(request, env, ctx);
    if (request.method !== 'POST') return new Response('POST only, or GET /places', { status: 405 });
    if (pathname === '/report') return reportPlace(request, env);
    // Per-IP limit so one client can't spend the whole OpenRouteService quota. Skipped where the binding isn't set up,
    // like `wrangler dev` without it. Cache hits below are free, but counting them too keeps the check simple.
    if (env.LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } });
    }
    // Apps from before walking and cycling send no mode, and mean driving.
    const { origin, places, mode = 'drive' } = await request.json().catch(() => ({}));
    const valid =
      Array.isArray(origin) &&
      origin.length === 2 &&
      Array.isArray(places) &&
      places.length > 0 &&
      places.length <= MAX_PLACES &&
      Object.hasOwn(PROFILES, mode) &&
      places.every((p) => typeof p.id === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!valid) {
      return new Response(`Expected [lng, lat], 1 to ${MAX_PLACES} places and a mode of ${Object.keys(PROFILES).join(', ')}`, {
        status: 400,
      });
    }

    // Rounded to about a kilometer, like the app's own cache.
    const from = origin.map((x) => Math.round(x * 100) / 100);
    const key = new Request(`https://drive-times.cache/${mode}/${from.join(',')}/${places.map((p) => p.id).sort().join(',')}`);
    const cached = await caches.default.match(key);
    if (cached) return cached;

    const upstream = await fetch(MATRIX_URL + PROFILES[mode], {
      method: 'POST',
      headers: { Authorization: env.ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [from, ...places.map((p) => [p.lng, p.lat])],
        sources: [0],
        metrics: ['duration'],
      }),
    });
    if (!upstream.ok) return new Response('Routing failed', { status: 502 });
    const { durations } = await upstream.json();
    // The first destination is the origin itself.
    const minutes = Object.fromEntries(
      places.map((p, i) => {
        const seconds = durations[0][i + 1];
        return [p.id, seconds == null ? null : Math.max(1, Math.round(seconds / 60))];
      }),
    );
    // The mode comes back so the app can tell this answer from an older Worker's, which always drove.
    const response = Response.json({ minutes, mode }, { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } });
    ctx.waitUntil(caches.default.put(key, response.clone()));
    return response;
  },
};
