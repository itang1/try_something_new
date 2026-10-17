# Try Something New

A local-activity checklist and random suggester. Explore picks a random activity, and Checklist tracks what you've done in each city, with drive times from your home address.

Today it's an Expo (React Native) app for iOS and Android, with no backend, and 67 activities in 10 subcategories, plus city icons and 849 places across Los Angeles and Columbus (see [design/data-model.md](design/data-model.md)). See [TODO.md](TODO.md) for what's next. [design/PROCESS.md](design/PROCESS.md) covers how it gets built, from spike to mockup to code. The SwiftUI version, with screenshots, is saved on the [`native-ios`](../../tree/native-ios) branch.

## What makes it different

- **It answers "what should I try?"** Maps and Yelp answer "where is a pottery studio?" and event apps answer "what's on tonight?" This app suggests something you've never done, then shows where to do it.
- **Always something to do:** activities aren't dated events, so the list never goes stale and works on any free afternoon.
- **One card, not a feed:** one suggestion at a time, so choosing takes seconds instead of scrolling.
- **Progress you can finish:** a checklist of what you've tried in your city, with a number that grows, not an endless list.
- **Starts easy, builds up:** every activity is tagged easy, a bit new, or stretch, and the bigger stretches wait until you've done a few.
- **Local to you, not just your city:** places are sorted by real drive time from your home, so someone in a suburb sees what's close to them first.
- **Affordable:** 65 of 67 activities cost $$ or less, and a cost filter finds the free ones.
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
- **Your choice:** filters for kind, where, level, drive, cost, and time, and "Not for me" items you can bring back. Feeling in control keeps motivation your own (self-determination theory).
- **What I avoid:** streaks that punish a missed week, and health claims.

### Data at scale

- **Venues:** will come from [Overture Maps](https://overturemaps.org), a free, open dataset of places worldwide (name, category, address, website, phone) that allows commercial use with attribution. Each activity maps to Overture categories, so adding a city means running the pipeline, not writing a list. Opening hours, ratings, and photos aren't in it, so the design doesn't depend on them.
- **Catalog:** versioned per-city files on a CDN, cached on the device so the app works offline.
- **User state:** completions are saved on the device in SQLite (`expo-sqlite`) as an append-only log, so they can sync later. A backend (Convex, Supabase, or Firestore) is chosen when sync is built.
- **Location:** `expo-location` for GPS and address lookup. Drive times come from the [OpenRouteService](https://openrouteservice.org) matrix API, one request for up to 3,000 places, and are cached on the device for 30 days. Until they arrive, or without a key, they fall back to a straight-line estimate at 50 km/h. To turn them on, put a free key in `.env.local` as `EXPO_PUBLIC_ORS_KEY`.
