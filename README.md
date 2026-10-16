# Try Something New

A local-activity checklist and random suggester. Explore picks a random activity, and Checklist tracks what you've done in each city, with drive times from your home address.

Today it's a native iOS app (SwiftUI and SwiftData, no backend) with 177 activities in 11 subcategories, covering Los Angeles, Columbus, and activities you can do anywhere. See [TODO.md](TODO.md) for what's next. The SwiftUI version, with screenshots, is saved on the [`native-ios`](../../tree/native-ios) branch.

## Design choices

### Moving from SwiftUI to Expo

The goal is to reach as many people as possible on iOS and Android, and to expand to many cities with thousands of venues. I'm porting the app to Expo (React Native).

- **One codebase.** I can't maintain separate iOS, Android, and web apps alone. Two native apps (SwiftUI and Jetpack Compose) would mean building every feature twice for a small visual gain.
- **What I give up:** MapKit's built-in pin and cluster animations. Widgets still need small native targets on each platform.
- **Alternatives I ruled out:** staying SwiftUI-only (no Android), Flutter (draws its own UI, so it feels less native on iOS), and Kotlin Multiplatform (still two UIs).
- **Map spike:** 5,000 clustered pins across 10 cities held 59 fps or better in the iOS Simulator, with the map ready in about half a second. The code and results are on the [`map-spike`](../../tree/map-spike) branch. I'll rerun it on real low-end phones before launch.

### Looking good on both platforms

- **Native where it matters:** tabs and sheets use the real platform components. Animations run on the UI thread with Reanimated, with Skia for effects and haptics on key actions.
- **One icon set on both platforms:** Material Symbols. It has a specific icon for 166 of 177 activities, against 150 for Phosphor (see [`design/icon-mapping.json`](design/icon-mapping.json)). The gaps are mostly crafts, which will get custom icons in the same style. SF Symbols are licensed for Apple platforms only. Each icon sits in a circle colored by subcategory, the same in lists, pins, and widgets.
- **Map:** Apple Maps on iOS and Google Maps on Android, with custom pins. Tapping a pin glides the camera and slides up a card, rather than animating the pin itself.

### Data at scale

- **Catalog:** versioned per-city files on a CDN, cached on the device so the app works offline.
- **User state:** completions and notes stay on the device first, then sync to a backend (Convex, Supabase, or Firestore, chosen when sync is built).
