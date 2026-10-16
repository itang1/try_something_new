# Map spike

A throwaway Expo app that answers one question before porting Try Something New: can `react-native-maps` show thousands of venues smoothly and look good on iOS and Android?

It shows 5,000 synthetic venues across 10 cities, clustered with `supercluster`, with custom icon pins. Tapping a pin glides the camera and slides up a card with a Directions button. Tapping a cluster zooms into it. The chips at the top jump between cities.

## What the overlay shows

- **UI fps:** frames per second on the UI thread, where map gestures and animations run. "Worst" is the lowest one-second window since the last reset.
- **JS fps:** the same for the JavaScript thread, where clustering runs.
- **JS stalls over 100 ms:** the longest gap between JavaScript frames.
- **Cluster:** how long the last cluster recompute took.
- **Markers on screen:** how many pins and clusters are drawn right now.
- **Map ready:** milliseconds from JavaScript start to the map's first render.

Tap the overlay to reset the worst values before each test.

## Running it

Measure on real phones in Release builds. The simulator and debug builds are slower and don't count.

- **iOS:** plug in the iPhone, then run `npx expo run:ios --configuration Release --device` and pick the phone.
- **Android:** Google Maps needs an API key in a build. Create one with the Maps SDK for Android enabled, add it to `app.json` under `expo.android.config.googleMaps.apiKey`, then run `npx expo run:android --variant release --device`.

## Tests

For each phone, reset the overlay, do the action for about 10 seconds, then write down the worst values.

1. Pan around Los Angeles zoomed out, with many clusters on screen.
2. Pinch zoom from a whole city down to single pins and back.
3. Tap clusters repeatedly until they split into pins.
4. Tap pins one after another: does the camera glide and the card slide up smoothly?
5. Jump between cities with the chips.
6. Force-quit, relaunch, and note "map ready".
7. Look: do the icon pins and card feel good enough to ship? Put the same flow next to MapKit in the SwiftUI app.

## Pass criteria

All must hold on both phones:

| Check | Target |
|---|---|
| Worst UI fps while panning and zooming | 55 or higher |
| Longest JS stall | under 100 ms |
| Cluster tap and pin tap | Smooth, with no visible hitch |
| Map ready after a cold start | under 1,500 ms |
| Looks | I'd be proud to ship it |

If any check fails, try MapLibre (`@maplibre/maplibre-react-native`) with the same tests before deciding.

## Results

| Check | iPhone (model) | Android (model) |
|---|---|---|
| Worst UI fps, panning | | |
| Worst UI fps, zooming | | |
| Longest JS stall | | |
| Cluster recompute | | |
| Map ready | | |
| Looks | | |

**Decision:**
