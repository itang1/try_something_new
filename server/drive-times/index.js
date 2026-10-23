// A Cloudflare Worker that answers drive-time requests for the app, so the OpenRouteService key never ships on phones
// and nearby people asking about the same places share one cached answer.
const MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';
const MAX_PLACES = 25;
const CACHE_SECONDS = 30 * 86400;

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return new Response('POST only', { status: 405 });
    const { origin, places } = await request.json().catch(() => ({}));
    const valid =
      Array.isArray(origin) &&
      origin.length === 2 &&
      Array.isArray(places) &&
      places.length > 0 &&
      places.length <= MAX_PLACES &&
      places.every((p) => typeof p.id === 'string' && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    if (!valid) return new Response(`Expected [lng, lat] and 1 to ${MAX_PLACES} places`, { status: 400 });

    // Rounded to about a kilometer, like the app's own cache.
    const from = origin.map((x) => Math.round(x * 100) / 100);
    const key = new Request(`https://drive-times.cache/${from.join(',')}/${places.map((p) => p.id).sort().join(',')}`);
    const cached = await caches.default.match(key);
    if (cached) return cached;

    const upstream = await fetch(MATRIX_URL, {
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
    const response = Response.json({ minutes }, { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } });
    ctx.waitUntil(caches.default.put(key, response.clone()));
    return response;
  },
};
