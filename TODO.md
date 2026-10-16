# Try Something New — TODO

## High Impact — Features

- [ ] **Plan it**: a "Pick a day" button on the card and detail sheet that adds a calendar event or reminder for a chosen day and place. Deciding when and where is one of the strongest ways to make people follow through.
- [ ] **Smarter random picker** — Add filter controls to the Explore tab (subcategory, max drive time, max cost) so users get tailored suggestions instead of pure random.
- [ ] **Notes & photos on activities** — Let users attach a personal note or photo to a visited activity to journal their experience.
- [ ] **Share sheet** — Add a share button so users can send an activity suggestion to friends via Messages, etc.

## Medium Impact — UX Polish

- [ ] **Celebration animation** — Show confetti or a fun animation when the user marks an activity as done (especially milestone completions like 10, 25, 50%).
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
