# Website Worker

The public website, as a Cloudflare Worker with no npm dependencies. It runs on its own `workers.dev` URL until there's a
custom domain, and builds every absolute link from the request's own origin, so moving it needs no code change.

| Route | What it is |
| --- | --- |
| `GET /` | Landing page: the promise, the pitch, proof points and the beta waitlist form (or store buttons) |
| `GET /activity/<id>?s=<kind>` | One page per activity in `data/activities.json`, with link-preview tags and "Open in the app". Old ids in `data/aliases.json` redirect. `s` is the kind of share: `tried`, `invite`, `bucket`, `partner`, anything else counts as `other` |
| `GET /privacy` | The privacy policy |
| `GET /.well-known/apple-app-site-association` | iOS universal links for `/activity/*`, once `APPLE_TEAM_ID` is set (404 until then) |
| `GET /.well-known/assetlinks.json` | Android app links, once `ANDROID_SHA256_FINGERPRINTS` is set (404 until then) |
| `POST /api/waitlist` | Adds an email to `waitlist`. Takes a form post (answers with a thank-you page) or JSON (answers `{ ok }`) |
| `POST /api/count` | Adds a row to `link_events`: `{ event, share_kind, activity_id }` |
| `public/*` | Icons and `site.js` (the counts and the in-page waitlist form), served as static assets |

The `/activity/<id>` path matches the app's `src/app/activity/[id].tsx`, so the same link opens the idea in the app once
universal and app links are set up, and this page everywhere else.

Pages set no cookies and load nothing from other sites. Counts carry the event, the kind of share and the activity, never
who shared or who visited. The activity pages are built from `data/activities.json` at deploy time, so redeploy after
catalog changes.

## Deploy

```sh
cd server/web
npx wrangler login                                   # once
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY     # once: the sb_publishable_... key
npx wrangler deploy
```

The publishable key is in the Supabase dashboard under Project Settings > API Keys. It's the same key the app uses, safe
in a client because the growth tables only allow inserts (see `supabase/migrations/20261031200000_growth_counts.sql`).
Never use the secret or service-role key here.

`npx wrangler dev` runs it locally. Without the secret, the waitlist answers with an error and counts are dropped.

## Vars

Set in `wrangler.jsonc` under `vars`, then redeploy.

| Var | Fill in when | Value |
| --- | --- | --- |
| `SUPABASE_URL` | Already set | `https://fueiospwqwukvqmwcfrn.supabase.co` |
| `CONTACT_EMAIL` | Now, if there's an address to use | Shown on the privacy page for waitlist removal and questions. Empty: the page says to use Send feedback in the app |
| `APP_STORE_URL` | The app is on the App Store | `https://apps.apple.com/app/id<number>`. Replaces the waitlist with store buttons |
| `PLAY_STORE_URL` | The app is on Google Play | `https://play.google.com/store/apps/details?id=com.poodlestrategy.trysomethingnew` |
| `APPLE_TEAM_ID` | There's an Apple Developer account | Membership details > Team ID (10 characters) |
| `ANDROID_SHA256_FINGERPRINTS` | The app is in the Play Console | Test and release > App integrity > App signing > SHA-256 of the app signing key, plus the upload key's if internal-testing builds should open links too. Comma-separated |

## Turning on universal and app links

1. Pick the domain and add it to the Worker: Cloudflare dashboard > Workers & Pages > `try-something-new-web` > Settings >
   Domains & Routes > Add custom domain. Nothing in the Worker needs to change.
2. Set `APPLE_TEAM_ID` and `ANDROID_SHA256_FINGERPRINTS`, redeploy, and check both files load:
   `curl https://<domain>/.well-known/apple-app-site-association` and `.../assetlinks.json`.
3. Set `EXPO_PUBLIC_WEB_URL=https://<domain>` in `.env.local` and in each EAS environment, then make a new build.
   `app.config.ts` then adds `applinks:<domain>` on iOS and a verified Android app link for `/activity`, the share card
   prints the host, invites link to `/activity/<id>?s=invite`, and Settings links to `/privacy`.

The `workers.dev` URL works for the pages and the waitlist now, but use the custom domain for app links: it's the one
that will last.

## Keeping the privacy page true

The page at `/privacy` describes what the code does as of its date. Update it, and its date in `pages.js`, when that
changes. It says crash reports carry no IP address: in Sentry, turn on Project Settings > Security & Privacy > Prevent
Storing of IP Addresses. Use the same facts for the App Store privacy labels and Play Data safety form.

## Reading the numbers

Nobody can read these tables through the API. Use the Supabase dashboard's SQL editor.

```sql
-- Waitlist: how many, and the list to email.
select count(*) from waitlist;
select email, city, source, created_at from waitlist order by created_at;

-- Remove someone who asked.
delete from waitlist where lower(email) = lower('someone@example.com');

-- Shared links: visits and taps by kind of share, last 30 days.
select share_kind, event, count(*)
from link_events
where created_at > now() - interval '30 days'
group by 1, 2
order by 1, 2;

-- Which shared activities bring people in.
select activity_id, count(*) filter (where event = 'visit') as visits,
       count(*) filter (where event in ('app_store', 'play_store', 'waitlist')) as conversions
from link_events
where activity_id is not null
group by 1
order by visits desc;

-- Opt-in app counts: events per day.
select date_trunc('day', created_at) as day, name, count(*)
from app_events
group by 1, 2
order by 1 desc, 3 desc;

-- Rough week 2 and week 4 retention: app opens by days since install.
select platform, count(*) filter (where days_since_install between 7 and 13) as week_2,
       count(*) filter (where days_since_install between 21 and 27) as week_4
from app_events
where name = 'app_open'
group by 1;
```

(`app_open` is whatever name the app ends up sending for an open; check `select distinct name from app_events`.)

## Rate limit

The `LIMITER` binding allows 60 count or waitlist requests a minute per IP. Pages aren't limited. Where the binding isn't
set up, like some `wrangler dev` runs, the check is skipped.
