# How this app gets built

## Order of operations

1. **Spike the risky part.** Before porting, a throwaway map with 5,000 clustered pins checked that Expo could handle scale. It lives on the [`map-spike`](../../../tree/map-spike) branch.
2. **Port to parity.** The Expo app matched the SwiftUI app screen by screen. The SwiftUI version is saved on the [`native-ios`](../../../tree/native-ios) branch, and the finished parity checklist is in git history.
3. **Mock up new screens.** New screens and flows are designed in the [UI mockup](https://claude.ai/artifact/1U6jG3YQMjzWfiNjXJMhVv) first, where changes are cheap.
4. **Write the data schema** the approved screens need.
5. **Build** each approved screen. From then on the code is the source of truth, and the mockup is history.
6. **Fill it with data** through the pipeline (Overture Maps venues), not by hand.

## Where feedback goes

- **New screens, flows, or gestures:** comment on the mockup.
- **Tweaks to built screens** (copy, spacing, color): change the code directly and check a simulator screenshot.

## Decisions from the mockup

- **One location control.** "Near Pasadena, CA" sits under the title, and the city follows from it. Visiting another city is an explicit trip with its own starting point, so drive times always make sense.
- **Activities, places, and city icons.** An activity (art museum, archery) is what you check off, and it holds its places (the Getty, the Norton Simon). A short hand-picked list of city icons covers the must-dos, and each icon also counts toward its activity.
- **Explore suggests something concrete:** an activity at a specific place, never just "visit a museum."
- **"Show me another"** replaces "Try something!" so the button says what it does. Swiping the card is a shortcut: left skips, right saves.
