// A Cloudflare Worker for the public website: the landing page with the beta waitlist, a page per activity for shared
// links (the same /activity/<id> path the app opens as a universal link), the privacy policy, the app-link files, and
// two small APIs that add rows to Supabase. Files in public/ (icons, site.js) are served by Workers static assets.
import { aliasFor } from './catalog.js';
import { activityPage, landingPage, notFoundPage, privacyPage, thanksPage } from './pages.js';
import { parseShareKind, storeUrl, validateCount, validateWaitlist } from './validate.js';

const BUNDLE_ID = 'com.pastureraised.trysomethingnew';
const PAGE_CACHE = 'public, max-age=300';
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** The vars the pages need, with the host taken from the request so any domain works. */
export function siteFrom(request, env) {
  return {
    origin: new URL(request.url).origin,
    appStoreUrl: storeUrl(env.APP_STORE_URL),
    playStoreUrl: storeUrl(env.PLAY_STORE_URL),
    contactEmail: /^[^\s@<>"]+@[^\s@<>"]+$/.test(env.CONTACT_EMAIL?.trim() ?? '') ? env.CONTACT_EMAIL.trim() : null,
  };
}

function page(body, status = 200, cache = PAGE_CACHE) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache, ...SECURITY_HEADERS },
  });
}

function json(data, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  });
}

async function limited(request, env) {
  // Skipped where the binding isn't set up, like `wrangler dev` without it.
  if (!env.LIMITER) return false;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.LIMITER.limit({ key: ip });
  return !success;
}

/**
 * Adds one row with the publishable key. The tables are insert-only for it, so it must not ask for the row back.
 * @param {{ SUPABASE_URL?: string, SUPABASE_PUBLISHABLE_KEY?: string }} env
 * @param {string} table
 * @param {object} row
 * @param {(url: string, init: RequestInit) => Promise<{ ok: boolean, status: number }>} [fetcher]
 * @returns {Promise<'ok' | 'duplicate' | 'failed'>}
 */
export async function insertRow(env, table, row, fetcher = fetch) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return 'failed';
  const response = await fetcher(`${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  }).catch(() => null);
  if (!response) return 'failed';
  if (response.ok) return 'ok';
  // A unique violation (Postgres 23505) comes back as 409.
  if (response.status === 409) return 'duplicate';
  return 'failed';
}

async function readBody(request) {
  const type = request.headers.get('Content-Type') ?? '';
  if (type.includes('application/json')) return (await request.json().catch(() => null)) ?? {};
  if (type.includes('form')) return Object.fromEntries(await request.formData().catch(() => new FormData()));
  return {};
}

async function joinWaitlist(request, env, ctx, site) {
  const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');
  const reply = (error, status) =>
    wantsJson ? json(error ? { ok: false, error } : { ok: true }, status) : page(thanksPage(site, { error }), status, 'no-store');

  if (await limited(request, env)) return reply('Too many tries. Please wait a minute and try again.', 429);
  const input = await readBody(request);
  const result = validateWaitlist(input);
  if (result.bot) return reply(null, 200);
  if (result.error) return reply(result.error, 400);

  const outcome = await insertRow(env, 'waitlist', result.row);
  if (outcome === 'failed') return reply('Something went wrong on our side. Please try again later.', 502);
  // Already on the list counts as success, and isn't counted again.
  if (outcome === 'ok') {
    const counted = validateCount({ event: 'waitlist', share_kind: input.share_kind, activity_id: input.activity_id });
    if (counted) ctx.waitUntil(insertRow(env, 'link_events', counted));
  }
  return reply(null, 200);
}

async function countEvent(request, env, ctx) {
  if (await limited(request, env)) return new Response(null, { status: 429 });
  const row = validateCount(await readBody(request));
  if (!row) return new Response('Unknown event', { status: 400 });
  ctx.waitUntil(insertRow(env, 'link_events', row));
  return new Response(null, { status: 204 });
}

function appleAssociation(env) {
  const team = env.APPLE_TEAM_ID?.trim();
  if (!team) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: [`${team}.${BUNDLE_ID}`],
          components: [{ '/': '/activity/*', comment: 'A page per activity opens the same idea in the app.' }],
        },
      ],
    },
  };
}

function androidAssetLinks(env) {
  const fingerprints = (env.ANDROID_SHA256_FINGERPRINTS ?? '')
    .split(',')
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  if (!fingerprints.length) return null;
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: BUNDLE_ID, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const site = siteFrom(request, env);
    const path = url.pathname;

    if (request.method === 'POST') {
      if (path === '/api/waitlist') return joinWaitlist(request, env, ctx, site);
      if (path === '/api/count') return countEvent(request, env, ctx);
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD, POST' } });
    }

    const shareKind = parseShareKind(url.searchParams.get('s'));
    if (path === '/') return page(landingPage(site, { shareKind }));
    if (path === '/privacy') return page(privacyPage(site));
    if (path === '/.well-known/apple-app-site-association') {
      const body = appleAssociation(env);
      return body ? json(body, 200, 'public, max-age=3600') : json({ error: 'Not set up' }, 404);
    }
    if (path === '/.well-known/assetlinks.json') {
      const body = androidAssetLinks(env);
      return body ? json(body, 200, 'public, max-age=3600') : json({ error: 'Not set up' }, 404);
    }

    const match = path.match(/^\/activity\/([^/]+)\/?$/);
    if (match) {
      let id = '';
      try {
        id = decodeURIComponent(match[1]);
      } catch {
        // A broken escape is just an unknown id.
      }
      const alias = aliasFor(id);
      if (alias) return Response.redirect(`${url.origin}/activity/${encodeURIComponent(alias)}${url.search}`, 301);
      const html = activityPage(site, { id, shareKind });
      if (html) return page(html);
    }
    return page(notFoundPage(site), 404);
  },
};
