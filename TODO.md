# Try Something New — TODO

## High Impact — Features


## Medium Impact — UX Polish

- [ ] **Undo toast** — After toggling "done," show a brief snackbar with an Undo button to prevent accidental taps.
- [ ] **Onboarding screen** — A brief first-launch walkthrough explaining the app and prompting city/location selection.
- [ ] **Statistics view** — A section showing insights: activities per subcategory, total completed this month, streaks, etc.
- [ ] **Widget** — A home screen widget that shows a daily random activity suggestion. Needs a small native target on each platform (WidgetKit on iOS, Glance on Android).

## Lower Priority — Technical & Platform

- [ ] **Tablet layout**: use sidebar navigation on larger screens (iPad and Android tablets).
- [ ] **Accessibility audit** — Add explicit accessibilityLabel/accessibilityHint to icon-heavy rows, filter chips, and the random picker card.
- [ ] **Real drive time estimates** — Replace the haversine/50 km/h approximation with a routing API for real driving ETAs (with caching), since MKDirections is iOS-only.
- [ ] **User-added activities** — Let users create custom activities beyond the seed data.
- [ ] **Sync**: sync visited status and notes across devices through the backend (Convex, Supabase, or Firestore), since iCloud is Apple-only.
- [ ] **Demo video** — Make one with brag (a coworker's tip).
