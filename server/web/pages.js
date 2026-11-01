// The site's pages as HTML strings. Pure functions of their inputs, so tests can render them without a Worker.
import { ACTIVITY_COUNT, findActivity, kindOf, LEVELS } from './catalog.js';
import { html, layout, raw, SITE_NAME } from './layout.js';

export const PROMISE = 'One new thing to try near you, one card at a time.';
const PITCH =
  'Stuck doing the same things every weekend? Try Something New suggests something you’ve never done, shows the closest place to do it (or how to do it at home), and keeps a checklist and memories of everything you’ve tried in your city.';
const PRIVACY_DATE = '2026-11-01';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A first line for someone who opened a shared link. Never says who shared it, because the link doesn't know.
const SHARE_LEADS = {
  tried: 'A friend tried this and thought you’d like it too.',
  invite: 'You’ve been invited to try this.',
  bucket: 'This is on a friend’s list of things to try.',
  partner: 'Found on Try Something New.',
  other: null,
};

/**
 * Settings that come from the Worker's vars.
 * @typedef {{ origin: string, appStoreUrl: string | null, playStoreUrl: string | null, contactEmail: string | null }} Site
 */

/** App Store and Google Play buttons when either is set, otherwise the waitlist form. */
function getTheApp(site, { source, shareKind = 'other', activityId = null }) {
  if (site.appStoreUrl || site.playStoreUrl) {
    return html`<div class="buttons">
${site.appStoreUrl ? html`<a class="button" href="${site.appStoreUrl}" data-count="app_store">Download on the App Store</a>` : ''}
${site.playStoreUrl ? html`<a class="button" href="${site.playStoreUrl}" data-count="play_store">Get it on Google Play</a>` : ''}
</div>`;
  }
  return waitlistForm({ source, shareKind, activityId });
}

function waitlistForm({ source, shareKind, activityId }) {
  return html`<section class="card" id="waitlist" aria-labelledby="waitlist-title">
<h2 id="waitlist-title" style="margin-top:0">Join the beta</h2>
<p class="muted">The beta starts in Los Angeles, beginning with Pasadena. Leave your email and we’ll send you an invite, and a note when the app launches. Nothing else.</p>
<form method="post" action="/api/waitlist" data-waitlist>
<label>Email<input type="email" name="email" autocomplete="email" required maxlength="254" inputmode="email"></label>
<label>City <span>(optional)</span><input type="text" name="city" autocomplete="address-level2" maxlength="80"></label>
<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<input type="hidden" name="source" value="${source}">
<input type="hidden" name="share_kind" value="${shareKind}">
${activityId ? html`<input type="hidden" name="activity_id" value="${activityId}">` : ''}
<div><button class="button" type="submit">Join the beta</button></div>
<p class="status" role="status" aria-live="polite"></p>
</form>
<p class="muted">We use your email only for the beta and launch. See the <a href="/privacy">privacy policy</a>.</p>
</section>`;
}

/** @param {Site} site */
export function landingPage(site, { shareKind = 'other' } = {}) {
  const hasStores = !!(site.appStoreUrl || site.playStoreUrl);
  const body = html`<section class="hero">
<h1>${PROMISE}</h1>
<p class="lede">${PITCH}</p>
${hasStores ? '' : html`<div class="buttons"><a class="button" href="#waitlist">Join the beta</a></div>`}
</section>
<ul class="points">
<li><strong>${ACTIVITY_COUNT} things to try</strong>Most of them free or cheap, from a pottery class to a waterfall hike, with real places nearby.</li>
<li><strong>No account</strong>Open it and get an idea. Your checklist and memories stay on your phone.</li>
<li><strong>No ads</strong>Nothing to buy and nothing sold about you.</li>
<li><strong>No streaks</strong>No guilt either. The pull is a new idea, not a number to keep up.</li>
</ul>
<p>Not an events app (nothing expires), not a review site, not a feed. Just one card at a time.</p>
<h2>Launching in Los Angeles</h2>
<p>We’re starting with Pasadena, then the rest of LA.</p>
${getTheApp(site, { source: 'landing', shareKind })}`;
  return layout({
    title: `${SITE_NAME}: ${PROMISE}`,
    fullTitle: true,
    description: PITCH,
    origin: site.origin,
    path: '/',
    body,
    data: { share: shareKind },
  });
}

function seasonOf(months) {
  if (!months?.length) return null;
  return months.length === 1 ? MONTHS[months[0] - 1] : `${MONTHS[months[0] - 1]} to ${MONTHS[months[months.length - 1] - 1]}`;
}

/** One sentence for link previews, built from the activity's own fields. */
export function describeActivity(a) {
  const kind = kindOf(a.subcategory).label.toLowerCase();
  const article = /^[aeiou]/.test(kind) ? 'An' : 'A';
  const facts = [
    LEVELS[a.level],
    a.duration && `about ${a.duration.toLowerCase()}`,
    a.cost && (a.cost === 'Free' ? 'free' : `cost ${a.cost}`),
  ]
    .filter(Boolean)
    .join(', ');
  const home = a.home ? ' You can do it at home too.' : '';
  return `${article} ${kind} idea. ${facts}.${home} Try Something New shows the closest place to do it.`;
}

/**
 * @param {Site} site
 * @param {{ id: string, shareKind: string }} options
 */
export function activityPage(site, { id, shareKind = 'other' }) {
  const a = findActivity(id);
  if (!a) return null;
  const kind = kindOf(a.subcategory);
  const parent = a.parent ? findActivity(a.parent) : null;
  const lead = SHARE_LEADS[shareKind];
  const season = seasonOf(a.months);
  const facts = [
    ['Kind', kind.label],
    ['Time', a.duration],
    ['Cost', a.cost],
    ['Level', LEVELS[a.level]],
    ['Where', a.setting === 'indoor' ? 'Indoors' : a.setting === 'outdoor' ? 'Outdoors' : null],
    ['Season', season],
    ['Good for', [a.kids && 'Kids', a.together && 'Friends or a group'].filter(Boolean).join(', ') || null],
  ].filter(([, v]) => v);
  const ways = [
    a.home && ['At home', a.home],
    a.anywhere && ['Anywhere', `${a.anywhere.where}. ${a.anywhere.detail}.`],
    a.host && ['Host it', a.host],
  ].filter(Boolean);
  const body = html`${lead ? html`<p class="muted" style="margin-top:16px">${lead}</p>` : ''}
<article class="card">
<span class="chip" style="background:${kind.color}">${kind.label}</span>
<h1>${a.name}</h1>
<p>${describeActivity(a)}</p>
${parent ? html`<p class="muted">One way to ${parent.name.charAt(0).toLowerCase() + parent.name.slice(1)}.</p>` : ''}
<dl class="facts">${facts.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
${ways.length ? html`<h2>Other ways to do it</h2><dl class="facts">${ways.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>` : ''}
</article>
<div class="buttons"><a class="button${site.appStoreUrl || site.playStoreUrl ? '' : ' secondary'}" href="trysomethingnew://activity/${encodeURIComponent(a.id)}" data-count="open_app">Open in the app</a></div>
<p class="muted">Don’t have the app yet? It suggests one new thing at a time and finds the closest place to try it.</p>
${getTheApp(site, { source: 'activity', shareKind, activityId: a.id })}`;
  return layout({
    title: a.name,
    description: describeActivity(a),
    origin: site.origin,
    path: `/activity/${encodeURIComponent(a.id)}`,
    body,
    data: { share: shareKind, activity: a.id },
  });
}

/** @param {Site} site */
export function notFoundPage(site) {
  const body = html`<h1>We couldn’t find that</h1>
<p>The link may be old, or the idea may have moved. There’s plenty more to try.</p>
<div class="buttons"><a class="button" href="/">Go to the home page</a></div>`;
  return layout({ title: 'Not found', description: PROMISE, origin: site.origin, path: '/', body, noindex: true });
}

/** After the waitlist form posts without JavaScript. */
export function thanksPage(site, { error = null } = {}) {
  const body = error
    ? html`<h1>That didn’t work</h1><p>${error}</p><div class="buttons"><a class="button" href="/#waitlist">Try again</a></div>`
    : html`<h1>You’re on the list</h1>
<p>Thanks! We’ll email you when the beta has room, and once more when the app launches.</p>
<div class="buttons"><a class="button secondary" href="/">Back to the home page</a></div>`;
  return layout({ title: error ? 'Try again' : 'Thanks', description: PROMISE, origin: site.origin, path: '/', body, noindex: true });
}

function contact(site) {
  return site.contactEmail
    ? html`email <a href="mailto:${site.contactEmail}">${site.contactEmail}</a>`
    : raw('use <strong>Send feedback</strong> in the app’s Settings');
}

/** @param {Site} site */
export function privacyPage(site) {
  const body = html`<div class="prose">
<h1>Privacy policy</h1>
<p class="muted">Last updated ${PRIVACY_DATE}</p>
<p><strong>The short version:</strong> what you do in Try Something New stays on your phone. There are no ads, we don’t sell data, and we don’t track you across other apps or websites. You don’t need an account.</p>

<h2>What stays on your phone</h2>
<p>Your ideas, saved and hidden ideas, plans, what you’ve done, ratings, notes and memory photos are stored on your device. A backup you export is a file you keep.</p>

<h2>Your location and drive times</h2>
<p>The app asks for your location only to show nearby places and how long it takes to drive there. It works without it, with at-home ideas and a city you pick.</p>
<p>To get drive times, the app sends your location <strong>rounded to about 1 km</strong>, with the nearby places it wants times for, to our drive-time server (run on Cloudflare). That server asks <a href="https://openrouteservice.org">OpenRouteService</a> for driving times, so OpenRouteService sees only the rounded location and the places, never your IP address. Answers are cached for up to 30 days by rounded location, so nearby people share them; nothing records who asked. Cloudflare sees your IP address to deliver the request, and we use it only for a moment to stop abuse.</p>
<p>When you search for your town or address, the phone’s own geocoder (Apple’s or Google’s) looks it up first. As you type, the app also sends what you’ve typed, with your area <strong>rounded to about 10 km</strong> so nearby matches come first, to the same drive-time server, which asks <a href="https://photon.komoot.io">Photon</a> (run by komoot, with OpenStreetMap data) for matching towns and addresses. Photon sees only the text and the rounded area, never your IP address. Answers are cached for up to 7 days by text and rounded area; nothing records who asked.</p>
<p>If you report a problem with a place, the app sends the place, the activity, the city, the reason you picked and any note you wrote to the drive-time server, which opens a public issue on our GitHub repository with them. It sends nothing else about you.</p>
<p>The map is drawn by Apple Maps on iPhone and Google Maps on Android, which load the area you look at. Directions and map searches open in your maps app, under its own policy.</p>
<p>To lean toward indoor ideas on wet, very hot or freezing days, the app asks <a href="https://open-meteo.com">Open-Meteo</a> for the current weather with your location <strong>rounded to about 10 km</strong>, at most once an hour. Open-Meteo sees your IP address with that request. You can turn this off in Settings under Weather-aware ideas.</p>

<h2>Crash reports</h2>
<p>When the app crashes, it sends a report to <a href="https://sentry.io">Sentry</a> so we can fix it: the error, the app version, and the phone model and system version, plus timing for a sample of screens. Reports carry no name, email, location or IP address. Builds without crash reporting set up send nothing.</p>

<h2>If you choose to sign in</h2>
<p>An account is optional, for backing up and syncing across your devices. If you sign in with Apple or Google, we store your account (an id and the email Apple or Google gives us) and what you sync, like ideas done, plans, ratings and notes, with <a href="https://supabase.com">Supabase</a>, our database host. Only your account can read your data. You can delete your account in the app, which deletes everything synced with it; what’s on your phone stays.</p>

<h2>Anonymous usage counts</h2>
<p>Off unless you turn it on. If you do, the app sends a short event name (like “planned an idea”), whether it’s iOS or Android, the app version, and how many days since you first opened the app. No device id, account or location, and nothing that links one count to another.</p>

<h2>Shared links and this website</h2>
<p>A shared link says what kind of share it came from (like a “tried it” card or an invite), never who sent it. When a page here opens, it counts the visit and taps on its buttons: the event, that kind of share, and the activity. Nothing about you, and no cookies.</p>

<h2>The beta waitlist</h2>
<p>If you join the waitlist, we keep your email and the city you typed, if any, only to email you about the beta and the launch. We don’t share or sell it. To be removed, ${contact(site)}.</p>

<h2>Who helps us run it</h2>
<ul>
<li>Cloudflare hosts this website and the drive-time server.</li>
<li>GitHub Pages hosts the lists of places the app downloads for each city. Those downloads carry nothing about you, though like any website it sees your IP address.</li>
<li>OpenRouteService works out drive times from rounded locations.</li>
<li>Photon, run by komoot, suggests towns and addresses from what you type in the location search.</li>
<li>Open-Meteo gives the current weather for a location rounded to about 10 km.</li>
<li>Sentry receives crash reports.</li>
<li>Supabase stores optional accounts, synced data, the waitlist and the anonymous counts.</li>
<li>Apple and Google provide sign-in, maps and the app stores.</li>
</ul>

<h2>Children</h2>
<p>The app is for a general audience and doesn’t knowingly collect personal information from children.</p>

<h2>Changes and contact</h2>
<p>If this policy changes, we’ll update this page and its date. Questions or requests: ${contact(site)}.</p>
</div>`;
  return layout({
    title: 'Privacy policy',
    description: 'What Try Something New keeps on your phone and the little it sends.',
    origin: site.origin,
    path: '/privacy',
    body,
  });
}
