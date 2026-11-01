import { aliasFor, ACTIVITY_COUNT } from '../server/web/catalog';
import { insertRow } from '../server/web/index';
import { escapeHtml } from '../server/web/layout';
import { activityPage, describeActivity, landingPage, notFoundPage, privacyPage } from '../server/web/pages';
import { parseShareKind, storeUrl, validateCount, validateWaitlist } from '../server/web/validate';
import activitiesFile from '../data/activities.json';

const site = { origin: 'https://example.workers.dev', appStoreUrl: null, playStoreUrl: null, contactEmail: null };

describe('web: share kinds', () => {
  it('keeps the known kinds and turns anything else into other', () => {
    expect(['tried', 'invite', 'bucket', 'partner'].map(parseShareKind)).toEqual(['tried', 'invite', 'bucket', 'partner']);
    expect(parseShareKind(' Tried ')).toBe('tried');
    expect(parseShareKind('someone@example.com')).toBe('other');
    expect(parseShareKind(null)).toBe('other');
    expect(parseShareKind(['tried'])).toBe('other');
  });
});

describe('web: waitlist validation', () => {
  it('accepts an email with an optional city and source', () => {
    expect(validateWaitlist({ email: ' a@b.co ', city: ' Pasadena ', source: 'landing' })).toEqual({
      row: { email: 'a@b.co', city: 'Pasadena', source: 'landing' },
    });
    expect(validateWaitlist({ email: 'a@b.co', city: '' })).toEqual({ row: { email: 'a@b.co', city: null, source: null } });
  });

  it('rejects bad emails and long cities, and drops odd sources', () => {
    expect(validateWaitlist({ email: 'nope' })).toHaveProperty('error');
    expect(validateWaitlist({})).toHaveProperty('error');
    expect(validateWaitlist({ email: `${'a'.repeat(250)}@b.co` })).toHaveProperty('error');
    expect(validateWaitlist({ email: 'a@b.co', city: 'x'.repeat(81) })).toHaveProperty('error');
    expect(validateWaitlist({ email: 'a@b.co', source: '<script>' })).toEqual({ row: { email: 'a@b.co', city: null, source: null } });
  });

  it('flags the honeypot', () => {
    expect(validateWaitlist({ email: 'a@b.co', website: 'spam.example' })).toEqual({ bot: true });
  });
});

describe('web: count validation', () => {
  it('takes the events and activities the table allows', () => {
    expect(validateCount({ event: 'visit', share_kind: 'tried', activity_id: 'arcade' })).toEqual({
      event: 'visit',
      share_kind: 'tried',
      activity_id: 'arcade',
    });
    expect(validateCount({ event: 'app_store' })).toEqual({ event: 'app_store', share_kind: 'other', activity_id: null });
  });

  it('rejects unknown events and activities', () => {
    expect(validateCount({ event: 'purchase' })).toBeNull();
    expect(validateCount({ event: 'visit', activity_id: 'not-a-thing' })).toBeNull();
    expect(validateCount(null)).toBeNull();
  });
});

describe('web: pages', () => {
  it('counts every activity and resolves aliases', () => {
    expect(ACTIVITY_COUNT).toBe(activitiesFile.activities.length);
    expect(aliasFor('korean-bbq')).toBe('new-cuisine');
    expect(aliasFor('arcade')).toBeNull();
    expect(aliasFor('constructor')).toBeNull();
  });

  it('renders an activity with preview tags, the app link and the waitlist', () => {
    const page = activityPage(site, { id: 'afternoon-tea', shareKind: 'tried' })!;
    expect(page).toContain('<h1>Have afternoon tea</h1>');
    expect(page).toContain('<meta property="og:title" content="Have afternoon tea">');
    expect(page).toContain('<meta property="og:url" content="https://example.workers.dev/activity/afternoon-tea">');
    expect(page).toContain('content="https://example.workers.dev/icon-512.png"');
    expect(page).toContain('href="trysomethingnew://activity/afternoon-tea"');
    expect(page).toContain('Food &amp; Drink');
    expect(page).toContain('Loose-leaf tea, scones');
    expect(page).toContain('name="share_kind" value="tried"');
    expect(page).toContain('data-activity="afternoon-tea"');
    expect(page).toContain('action="/api/waitlist"');
    expect(page).not.toContain('App Store');
  });

  it('shows store buttons in place of the waitlist once they are set', () => {
    const page = activityPage(
      { ...site, appStoreUrl: 'https://apps.apple.com/app/id1', playStoreUrl: null },
      { id: 'arcade', shareKind: 'other' },
    )!;
    expect(page).toContain('href="https://apps.apple.com/app/id1" data-count="app_store"');
    expect(page).not.toContain('Google Play');
    expect(page).not.toContain('action="/api/waitlist"');
    expect(storeUrl('javascript:alert(1)')).toBeNull();
    expect(storeUrl('')).toBeNull();
  });

  it('returns nothing for an unknown activity, and a 404 page', () => {
    expect(activityPage(site, { id: 'nope', shareKind: 'other' })).toBeNull();
    const page = notFoundPage(site);
    expect(page).toContain('We couldn’t find that');
    expect(page).toContain('noindex');
  });

  it('describes every activity in one line', () => {
    for (const a of activitiesFile.activities) expect(describeActivity(a)).toMatch(/^An? [a-z& ]+ idea\. \S/);
  });

  it('renders the landing page and the privacy policy', () => {
    const landing = landingPage(site);
    expect(landing).toContain('One new thing to try near you, one card at a time.');
    expect(landing).toContain(`${ACTIVITY_COUNT} things to try`);
    expect(landing).toContain('Pasadena');
    const privacy = privacyPage(site);
    expect(privacy).toContain('2026-11-01');
    expect(privacy).toContain('Photon');
    expect(privacy).toContain('Send feedback');
    expect(privacyPage({ ...site, contactEmail: 'hi@example.com' })).toContain('mailto:hi@example.com');
  });

  it('escapes HTML', () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
});

describe('web: Supabase inserts', () => {
  const env = { SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };

  it('posts one row without asking for it back, and treats a repeat signup as done', async () => {
    const calls: [string, RequestInit][] = [];
    const reply = (status: number) => async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return { ok: status < 300, status };
    };
    expect(await insertRow(env, 'waitlist', { email: 'a@b.co' }, reply(201))).toBe('ok');
    expect(await insertRow(env, 'waitlist', { email: 'a@b.co' }, reply(409))).toBe('duplicate');
    expect(await insertRow(env, 'waitlist', { email: 'a@b.co' }, reply(500))).toBe('failed');
    const [url, init] = calls[0];
    expect(url).toBe('https://x.supabase.co/rest/v1/waitlist');
    expect(init.headers).toMatchObject({
      apikey: 'sb_publishable_test',
      Authorization: 'Bearer sb_publishable_test',
      Prefer: 'return=minimal',
    });
  });

  it('fails without a key', async () => {
    expect(await insertRow({ SUPABASE_URL: env.SUPABASE_URL }, 'link_events', {}, jest.fn())).toBe('failed');
  });
});
