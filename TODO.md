# Try Something New — TODO

## High Impact — Features

- [ ] **Activity detail view** — Tapping a row in the Checklist currently just toggles "done." Add a dedicated detail sheet with full info, a mini map of venue locations, and a button to open directions in Apple Maps.
- [ ] **Smarter random picker** — Add filter controls to the Explore tab (subcategory, max drive time, max cost) so users get tailored suggestions instead of pure random.
- [ ] **Map tab or map view** — Display activity venue locations on a Map so users can visually browse what's nearby. Tapping a pin opens the detail view.
- [ ] **Notes & photos on activities** — Let users attach a personal note or photo to a visited activity to journal their experience.
- [ ] **Share sheet** — Add a share button so users can send an activity suggestion to friends via Messages, etc.

## Medium Impact — UX Polish

- [ ] **Celebration animation** — Show confetti or a fun animation when the user marks an activity as done (especially milestone completions like 10, 25, 50%).
- [ ] **Undo toast** — After toggling "done," show a brief snackbar with an Undo button to prevent accidental taps.
- [ ] **Onboarding screen** — A brief first-launch walkthrough explaining the app and prompting city/location selection.
- [ ] **Statistics view** — A section showing insights: activities per subcategory, total completed this month, streaks, etc.
- [ ] **Widget** — A home screen widget that shows a daily random activity suggestion using WidgetKit.

## Lower Priority — Technical & Platform

- [ ] **iPad / Mac layout** — Use NavigationSplitView for sidebar navigation on larger screens.
- [ ] **Accessibility audit** — Add explicit accessibilityLabel/accessibilityHint to icon-heavy rows, filter chips, and the random picker card.
- [ ] **Real drive time estimates** — Replace the haversine/50 km/h approximation with MKDirections for real driving ETAs (with caching).
- [ ] **User-added activities** — Let users create custom activities beyond the seed data.
- [ ] **CloudKit sync** — Sync visited status and notes across devices via iCloud.
- [ ] **Demo video** — Make one with brag (a coworker's tip).
