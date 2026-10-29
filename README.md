# Try Something New

A local-activity checklist and random suggester. Explore picks a random activity, and Checklist tracks what you've done in each city, with drive times from your home address.

Today it's an Expo (React Native) app for iOS and Android, with no backend, and 102 activities in 9 subcategories, plus city icons and 34,957 places across Los Angeles, Seattle, Chicago, and Columbus (see [design/data-model.md](design/data-model.md)). See [TODO.md](TODO.md) for what's next. [design/PROCESS.md](design/PROCESS.md) covers how it gets built, from spike to mockup to code. The SwiftUI version, with screenshots, is saved on the [`native-ios`](../../tree/native-ios) branch.

## What makes it different

- **It answers "what should I try?"** Maps and Yelp answer "where is a pottery studio?" and event apps answer "what's on tonight?" This app suggests something you've never done, then shows where to do it.
- **Always something to do:** activities aren't dated events, so the list never goes stale and works on any free afternoon.
- **One card, not a feed:** one suggestion at a time, so choosing takes seconds instead of scrolling.
- **Progress you can finish:** a checklist of what you've tried in your city, with a number that grows, not an endless list.
- **Starts easy, builds up:** every activity is tagged easy, a bit new, or stretch, and the bigger stretches wait until you've done a few.
- **Local to you, not just your city:** places are sorted by real drive time from your home, so someone in a suburb sees what's close to them first.
- **Affordable:** 99 of 102 activities cost $$ or less, and a cost filter finds the free ones.
- **From idea to done:** pick a day and place, invite a friend, add it to your calendar, then save a memory with a rating, note, and photo.
- **Private by default:** no account, no ads, no tracking. Everything stays on the phone and works offline.
- **No guilt:** no streaks to break and no health claims.
- **Built to grow:** places come from open map data, so adding a city means running a script, not writing a list.

## Design choices

The goal is to reach as many people as possible on iOS and Android, and to expand to many cities with thousands of venues.

### One codebase: Expo

I ported the app from SwiftUI to Expo (React Native), with Expo Router for navigation.

- **Why:** I can't maintain separate iOS, Android, and web apps alone. Two native apps (SwiftUI and Jetpack Compose) would mean building every feature twice for a small visual gain.
- **What I give up:** MapKit's built-in pin and cluster animations. The iOS widget comes from expo-widgets, but an Android widget still needs a small native target.
- **Alternatives I ruled out:** staying SwiftUI-only (no Android), Flutter (draws its own UI, so it feels less native on iOS), and Kotlin Multiplatform (still two UIs).
- **Map spike:** 5,000 clustered pins across 10 cities held 59 fps or better in the iOS Simulator, with the map ready in about half a second. The code and results are on the [`map-spike`](../../tree/map-spike) branch. I'll rerun it on real low-end phones before launch.

### Looking good on both platforms

- **Native where it matters:** tabs, sheets, menus, and the search bar are the real platform components. Header buttons use SF Symbols on iOS and Material Symbols on Android.
- **Motion:** animations run on the UI thread with Reanimated, with haptics (`expo-haptics`) on key actions. Skia is planned for effects.
- **One icon set:** Material Symbols. When I chose it, it had a specific icon for 166 of 177 activities, against 150 for Phosphor. SF Symbols are licensed for Apple platforms only. The gaps are mostly crafts, which will get custom icons in the same style.
- **Icon pipeline:** [`design/icon-mapping.json`](design/icon-mapping.json) picks an icon per activity. `npm run icons` copies their shapes from `@material-symbols/svg-400` into `src/icons/paths.ts`, so only the icons in use ship, drawn with `react-native-svg`.
- **Color:** each subcategory has a color and a two-color gradient, defined in [`src/theme.ts`](src/theme.ts) from the iOS system palette. Each icon sits in a circle or tile with that gradient, the same in lists, pins, and widgets.
- **Map:** Apple Maps on iOS and Google Maps on Android, with custom pins. Tapping a pin glides the camera and slides up a card, rather than animating the pin itself.

### Why this works

The app is built on a few findings from psychology. The evidence varies, so the app says "linked to," never "treats."

- **Novelty and mood:** a 2020 study that tracked people by GPS found that days with more varied places were linked to more positive mood. That's the core premise.
- **Experiences over things:** spending on experiences tends to bring more lasting happiness than buying possessions (Van Boven and Gilovich, 2003, and later studies).
- **One suggestion at a time:** a long list can stall a decision, so Explore shows one card, and "Not for me" keeps you in control.
- **Progress you can finish:** people speed up as a goal gets closer, so progress counts activities tried, not every place in the city. Collecting every place stays optional.
- **Plan it:** picking a day and place for an activity, which reliably raises follow-through (implementation intentions), and reflecting afterward with a rating and a note.
- **Looking back:** a memories timeline of what you tried, with your ratings, notes, and photos. Revisiting good experiences (savoring) is linked to enjoying them more.
- **Easy wins first:** activities are tagged easy, a bit new, or stretch. Explore holds back stretches until you've tried a few things, building confidence step by step (behavioral activation).
- **Doing it together:** "Invite a friend" shares the plan. Plans made with someone are more fun and harder to skip.
- **Your choice:** filters for kind, where, setting, who's coming, level, drive, cost, and time, and "Not for me" items you can bring back. Feeling in control keeps motivation your own (self-determination theory).
- **What I avoid:** streaks that punish a missed week, and health claims.

### Data at scale

- **Venues:** come from [Overture Maps](https://overturemaps.org), a free, open dataset of places worldwide (name, category, address, website, phone) that allows commercial use with attribution. Each activity maps to Overture categories, so adding a city means running the pipeline, not writing a list: `npm run overture -- <city>` takes about ten seconds. Parks, trails, and bike routes come from OpenStreetMap (`scripts/import-osm.mjs`), where they're mapped better. Opening hours, ratings, and photos aren't in it, so the design doesn't depend on them.
- **Catalog:** versioned per-city files on a CDN, cached on the device so the app works offline. `npm run catalog` writes them to `dist/catalog`. A GitHub Action publishes it to GitHub Pages on every data change, and `.env` points the app there with `EXPO_PUBLIC_CATALOG_URL`. A slim copy of Los Angeles (its must-dos and hand-picked places) ships inside the app; full cities download when needed.
- **User state:** completions are saved on the device in SQLite (`expo-sqlite`) as an append-only log, so they can sync later. A backend (Convex, Supabase, or Firestore) is chosen when sync is built.
- **Location:** `expo-location` for GPS and address lookup. Drive times come from the [OpenRouteService](https://openrouteservice.org) matrix API, one request for up to 3,000 places, and are cached on the device for 30 days. Until they arrive, or without a key, they fall back to a straight-line estimate at 50 km/h. To turn them on, put a free key in `.env.local` as `EXPO_PUBLIC_ORS_KEY`. Only the 25 nearest places get real times. For release, the key lives in a Cloudflare Worker ([`server/drive-times`](server/drive-times)) and the app gets its URL as `EXPO_PUBLIC_ROUTING_URL`, so the key never ships on phones.
- **Credits:** OpenStreetMap (ODbL) and Overture Maps (CDLA Permissive 2.0) both require attribution. The map shows their notices in its corner, each activity's place list names its sources, and an About screen (the info button on Explore) lists every source, what it's used for, and its license. They're defined once in [`src/data/credits.ts`](src/data/credits.ts), and a place's source is read from its id prefix. A new data source gets a line there.
- **Reports:** a flag on each place opens an email about a wrong or closed place, with its id filled in. The address goes in `.env.local` as `EXPO_PUBLIC_REPORT_EMAIL`, kept out of the public repo, and the flag is hidden without it. Fixes go into the import rules or the city file.
- **Crash reports:** [Sentry](https://sentry.io) through `@sentry/react-native`, set up in [`src/crash-reporting.ts`](src/crash-reporting.ts). Release builds send crashes and slow screens when `EXPO_PUBLIC_SENTRY_DSN` is set; development builds and builds without it send nothing. Reports carry no user details, and places, plans and locations stay on the device. For readable stack traces, EAS builds also need `SENTRY_AUTH_TOKEN` (a sensitive secret), `SENTRY_ORG` and `SENTRY_PROJECT` in their environment so source maps upload.
- **Checks:** a GitHub Action runs `npm run lint`, `npm run typecheck` and `npm test` (Jest with `jest-expo`, tests in `__tests__/`) on every pull request.

## Building

Builds run in the cloud on [EAS](https://docs.expo.dev/eas/), set up in `eas.json`:

- **development:** a dev client for testing native changes, shared by link. `development-simulator` is the same for the iOS Simulator.
- **preview:** a standalone build to share by link, an APK on Android.
- **production:** the store build. EAS keeps the build number and bumps it each time.

```bash
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform android
```

`app.config.ts` reads keys from the environment, so none are in git. Each profile picks the matching [EAS environment](https://docs.expo.dev/eas/environment-variables/), and `.env.local` isn't uploaded, so build values live on EAS:

| Variable | What it's for |
| --- | --- |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Google Maps on Android. Without it the map is blank. |
| `EXPO_PUBLIC_ROUTING_URL` | The drive-times Worker, for preview and production. |
| `EXPO_PUBLIC_REPORT_EMAIL` | Where place reports go. |
| `EXPO_PUBLIC_SENTRY_DSN` | Where crash reports go. Without it none are sent. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Uploading source maps so crash reports show readable stack traces. The token is sensitive. |

Set each one once per environment, for example:

```bash
npx eas-cli@latest env:set --name GOOGLE_MAPS_ANDROID_API_KEY --value <key> \
  --environment development --environment preview --environment production --visibility sensitive
```

The Maps key ships inside the app, so its protection is a restriction in Google Cloud to the package `com.pastureraised.trysomethingnew` and the app's SHA-1 fingerprints (`npx eas-cli@latest credentials` shows them), not secrecy.
