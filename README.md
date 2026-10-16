# Try Something New

A local-activity checklist and random suggester. Explore picks a random activity, and Checklist tracks what you've done in each city, with drive times from your home address.

Today it's an Expo (React Native) app for iOS and Android, with no backend, and 68 activities in 11 subcategories, plus city icons and 262 places across Los Angeles and Columbus (see [design/data-model.md](design/data-model.md)). See [TODO.md](TODO.md) for what's next. [design/PROCESS.md](design/PROCESS.md) covers how it gets built, from spike to mockup to code. The SwiftUI version, with screenshots, is saved on the [`native-ios`](../../tree/native-ios) branch.

## Design choices

The goal is to reach as many people as possible on iOS and Android, and to expand to many cities with thousands of venues.

### One codebase: Expo

I ported the app from SwiftUI to Expo (React Native), with Expo Router for navigation.

- **Why:** I can't maintain separate iOS, Android, and web apps alone. Two native apps (SwiftUI and Jetpack Compose) would mean building every feature twice for a small visual gain.
- **What I give up:** MapKit's built-in pin and cluster animations. Widgets still need small native targets on each platform.
- **Alternatives I ruled out:** staying SwiftUI-only (no Android), Flutter (draws its own UI, so it feels less native on iOS), and Kotlin Multiplatform (still two UIs).
- **Map spike:** 5,000 clustered pins across 10 cities held 59 fps or better in the iOS Simulator, with the map ready in about half a second. The code and results are on the [`map-spike`](../../tree/map-spike) branch. I'll rerun it on real low-end phones before launch.

### Looking good on both platforms

- **Native where it matters:** tabs, sheets, menus, and the search bar are the real platform components. Header buttons use SF Symbols on iOS and Material Symbols on Android.
- **Motion:** animations run on the UI thread with Reanimated, with haptics (`expo-haptics`) on key actions. Skia is planned for effects.
- **One icon set:** Material Symbols. When I chose it, it had a specific icon for 166 of 177 activities, against 150 for Phosphor. SF Symbols are licensed for Apple platforms only. The gaps are mostly crafts, which will get custom icons in the same style.
- **Icon pipeline:** [`design/icon-mapping.json`](design/icon-mapping.json) picks an icon per activity. `npm run icons` copies their shapes from `@material-symbols/svg-400` into `src/icons/paths.ts`, so only the icons in use ship, drawn with `react-native-svg`.
- **Color:** each subcategory has a color and a two-color gradient, defined in [`src/theme.ts`](src/theme.ts) from the iOS system palette. Each icon sits in a circle or tile with that gradient, the same in lists, pins, and widgets.
- **Map:** Apple Maps on iOS and Google Maps on Android, with custom pins. Tapping a pin glides the camera and slides up a card, rather than animating the pin itself.

### Data at scale

- **Venues:** will come from [Overture Maps](https://overturemaps.org), a free, open dataset of places worldwide (name, category, address, website, phone) that allows commercial use with attribution. Each activity maps to Overture categories, so adding a city means running the pipeline, not writing a list. Opening hours, ratings, and photos aren't in it, so the design doesn't depend on them.
- **Catalog:** versioned per-city files on a CDN, cached on the device so the app works offline.
- **User state:** completions are saved on the device in SQLite (`expo-sqlite`) as an append-only log, so they can sync later. A backend (Convex, Supabase, or Firestore) is chosen when sync is built.
- **Location:** `expo-location` for GPS and address lookup. Drive times are a straight-line estimate at 50 km/h for now.
