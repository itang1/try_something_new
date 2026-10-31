# Try Something New: Roadmap

The single list of what to build next. It replaces `TODO.md`. Last refreshed 2026-10-31, against `main` at `0ad47db` plus open PR #6.

## How to use this roadmap

**Status markers**

| Marker | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[~]` | In progress or partly done. The note says what's left and which PR has it. |
| `[x]` | Done. Moves to the Done section at the bottom with its PR number. |
| `[?]` | Needs a decision from you before anyone builds it |

**Each item** is one line you can hand to someone, or to Claude, as a task:

```
- [ ] **Short title** · Area · Size. What and why, in a sentence or two.
```

- **Area:** Launch, Feature, UX, Backend, Architecture, Data, Growth.
- **Size:** S is about a day, M is 2 to 5 days, L is 1 to 3 weeks, XL is over 3 weeks.
- The bold title is the item's name. Use it word for word in PR titles, commits and prompts, so it's easy to find again.

**Adding an item:** put it in the horizon where it belongs (Now, Next or Later) with `[ ]`, an area and a size. If you aren't sure where it goes, add it to the bottom of Next and move it at the next refresh. Ideas you haven't thought through can go under Inbox.

**Picking the next one:** take the top item in **Up next**. If it's blocked (it needs your account, a device, or a decision), take the next one. Up next is ordered by:
1. Things that block launch or could lose someone's data.
2. Things a real user would notice this week.
3. Small before large when the value is similar, so work keeps shipping.

**Finishing an item:** the PR that finishes it also ticks it here (`[x]`), moves it to Done with the PR number, and pulls the next item into Up next. A PR that only does part of an item marks it `[~]` and says what's left.

**Refreshing:** every few weeks, or after a batch of PRs merges, re-check statuses against merged PRs, re-order Up next, and update the date at the top.

**Working on it with Claude, cheaply**

- One item per thread. From the project chat, say something like: *"Start a thread for the next item in ROADMAP.md's Up next."* or *"Do 'Run expo-doctor in CI' from ROADMAP.md."* The item's line is the whole brief, so the thread doesn't need to re-read the repo to decide what to build.
- Batch S items that touch the same area into one thread and one PR ("Do the three Data S items in Next").
- Ask for a plan first on L and XL items, and split them into M items here before building.
- Keep the thread focused: merge or close its PR, then start a fresh thread for the next item instead of continuing a long one.
- When credits run low: pick the item yourself, and run Claude Code locally in this repo with the same prompt. `AGENTS.md` and this file give it the same context.

## Up next

In order. These are the ones to start a thread on.

1. [ ] **Prepare the data for sync** · Architecture · M. Client-made UUIDs instead of `AUTOINCREMENT`, saved and hidden lists as events, a device id, and one storage module the sync code plugs into. Cheap now, painful after launch. The migration tests make the switch safer.
2. [ ] **Store places in indexed SQLite tables** · Architecture · M. Each city is one JSON blob parsed whole, and Seoul makes five. Query by bounding box instead, to cut memory and launch time.
3. [ ] **Optional account with cross-device sync** · Backend · L. Ask for a plan first and split it into M items here. Builds on the two items above; see Storage decision below.
4. [~] **Check off the at-home way** · UX · S. Being added to PR #6: one "Where to do it" list with "At home" as the first row, each row with the same checkmark.
5. [?] **Count a specific craft toward "Try a new craft"** · Feature · S. Open question from PR #6. Recommendation: yes, doing any kind checks off the broad idea once, and the broad idea stops coming back as "try another".
6. [ ] **Check merged work on a real phone** · Launch · S. Backup share sheet and file picker, Sentry, the Dusk Ember theme in light and dark, the splash and Android themed icon, the map credit label, the new Settings and crash screens, and the accessibility pass (VoiceOver, TalkBack and the largest text size). None of these has run on a device yet. Needs you and a development build.
7. [ ] **Finish Seoul's parks and trails** · Data · S. Needs your computer: the cloud can't reach Overpass. Run `node scripts/import-osm.mjs seoul 37.19,126.5,37.95,127.46` and commit the result. Overture has few parks and no bike routes there, so Seoul's outdoors list is mostly hand-picked until then.
8. [ ] **Build the Android widget** · Feature · M. expo-widgets covers iOS only. Add a Glance widget through a config plugin that shows the same daily idea.
9. [x] **Run expo-doctor in CI** · Architecture · S. Left over from the CI PR (#3). Add `npx expo-doctor` to `.github/workflows/ci.yml`.

## Now: before launch

- [~] **Add a Settings screen** · UX · M. Weekend ideas on/off, backup, credits and version are in. Left: miles or kilometers, a privacy policy link, and a feedback link.
- [~] **Make the tabs easier to get around** · UX · M. PR #11: one header pattern on every tab (the tab's own filter or sort button, then Settings, always top right), Map filters for Not done, Done, Saved and kind, a Checklist grouped by kind with folding sections, and Memories opened from the progress card. Left: check it on a phone.
- [~] **Protect the drive-time Worker** · Backend · S. Per-IP rate limiting is in, and goes live on the next `npx wrangler deploy`. Left: App Attest / Play Integrity once the app is in the stores.
- [ ] **Check merged work on a real phone** · Launch · S. See Up next.
- [ ] **Prepare the data for sync** · Architecture · M. See Up next.
- [ ] **Store places in indexed SQLite tables** · Architecture · M. See Up next.
- [ ] **Optional account with cross-device sync** · Backend · L. See Up next.
- [ ] **Finish Seoul's parks and trails** · Data · S. See Up next.
- [ ] **Build the Android widget** · Feature · M. From the old TODO.
- [x] **Run expo-doctor in CI** · Architecture · S. See Up next.
- [ ] **Finish the release setup** · Launch · S. Needs your accounts: `eas init`, EAS environment variables, Apple and Play developer accounts, then EAS Update with a fingerprint runtime version. Steps are in PR #2's description and the README.
- [ ] **Test on a cheap Android phone** · Launch · S. Cold start, parsing the Los Angeles file, and the map with every pin. The map spike only ran in the iOS Simulator.
- [ ] **Decide on iPad** · UX · S. `supportsTablet` is on, so Apple will review it on iPad. Either give the main screens two columns or turn tablets off for launch.
- [ ] **Write the privacy policy and store forms** · Launch · S. A short page on GitHub Pages, App Store privacy labels, Play Data safety. Say that a rounded location goes to the drive-time Worker and that crash reports carry no personal data.
- [ ] **Make the store listing and demo video** · Growth · M. Screenshots per platform, a short description built on "one idea at a time", and a demo video made with brag. From the old TODO.

## Next: 1 to 3 months after launch

**Location-agnostic and at-home ideas** (new, building on PR #6)

- [~] **Suggest at-home crafts and broad ideas** · Feature · M. PR #6: a "Try a new craft" parent with 16 kinds, studio or DIY on each card, and Stay in leading with the home version. Waiting on your review.
- [ ] **Use the app without a city** · Feature · M. Someone outside the 5 cities, or who skips location, should still get at-home and host-friends ideas instead of an empty Explore.
- [ ] **More broad ideas like crafts** · Data · S. Use the same parent model for "Cook something new", "Learn a new skill" and "Host friends", once PR #6 merges.
- [~] **More at-home and DIY versions** · Data · S. Add a `home` line to activities that can work at home and don't have one yet, and a few new home-only crafts. PR #16: home versions for 12 more activities (yoga, karaoke, hot pot, mini golf in the backyard and more), a new "anywhere" option for 11 that need no set venue (pickleball in a backyard or any tennis court, tennis, roller skating, disc golf and more) that checks off like a place, and a host line for run club. Left: a few new home-only crafts.
- [ ] **Draw custom icons for crafts** · UX · S. The activities without a Material Symbol, mostly crafts, in the same style.

**Accounts and sync**

- [ ] **Optional account with cross-device sync** · Backend · L. Moved up to Now; see Up next. "Back up and sync" in Settings with Sign in with Apple or Google, push and pull the logs, merge by latest event, in-app account deletion. Recommended backend: Supabase (see Storage decision below). From the old TODO.
- [ ] **Back up memory photos** · Backend · M. Resize to about 1600 px, upload on Wi-Fi in the background, keep the local copy as the one shown.

**Better suggestions**

- [ ] **Weather-aware suggestions** · Feature · M. Open-Meteo is free with no key. On rainy or very hot days lean toward indoor and at-home picks.
- [ ] **Learn from ratings** · Feature · M. "Loved it" boosts that kind and level, "Not for me" lowers similar ones. All on the phone.
- [ ] **Themed collections** · Data · M. Date ideas, rainy day, under $20, with kids, free this weekend. Built from existing tags.
- [ ] **Gentle milestones and a monthly recap** · Feature · M. "Tried something from all 9 kinds", a month in review, and a shareable memory card. Still no streaks.

**Getting there**

- [ ] **Walking, cycling and transit times** · Feature · M. OpenRouteService has walking and cycling on the same matrix API. Add a "How do you get around?" setting.
- [ ] **Address autocomplete** · UX · M. Proxy Photon (free, OpenStreetMap) through the Worker so no key ships.

**Data**

- [ ] **Directions in Korea** · UX · S. Google Maps has no driving directions in South Korea, so on Android open Naver Map or KakaoMap for Seoul places, with Google Maps as the fallback.
- [ ] **Show kilometers outside the US** · UX · S. Default to kilometers for cities like Seoul, alongside the miles or kilometers setting.
- [ ] **English names for Seoul places** · Data · M. Overture only has Korean names there. Options: OpenStreetMap's `name:en` (comes with the OSM import), or the Korea Tourism Organization's English TourAPI, which needs a free key from data.go.kr.
- [ ] **Add more cities** · Data · M. The 25 largest US metros, then a few international ones. Re-import monthly from a scheduled Action.
- [ ] **Show opening hours where known** · Data · M. OpenStreetMap `opening_hours`, an "Open now" badge, never hiding places without hours.
- [ ] **Wheelchair and stroller access** · Data · S. Read OpenStreetMap's `wheelchair` tag and add an "Accessible" filter.
- [ ] **Report a place through a form** · Data · S. A Worker endpoint that opens a GitHub issue with the place id, instead of email.
- [ ] **Opt-in, privacy-friendly analytics** · Growth · S. Anonymous counts (shown, saved, planned, done) with TelemetryDeck or Aptabase. Off by default.

## Later: once people stick around

- [ ] **Shared plans with "I'm in"** · Feature · L. A web page per plan with add-to-calendar and an RSVP. Needs the backend and push.
- [ ] **Friends and couples mode** · Feature · XL. A shared checklist with a partner or group.
- [ ] **Web pages for each city** · Growth · L. "Things to try in Seattle" pages built from the catalog.
- [ ] **Siri, App Shortcuts and lock screen widgets** · Feature · M. "Give me an idea" by voice, StandBy widgets, a Live Activity on a plan's day.
- [ ] **Translate the app** · Growth · L. Spanish first, with local units and prices.
- [ ] **Trip planner** · Feature · M. Turn trip mode into a day-by-day weekend plan.
- [ ] **Community tips per place** · Data · XL. Only with a moderation plan.
- [ ] **Seasonal events layer** · Feature · L. Festivals and seasonal openings as an optional extra.
- [ ] **A way to support the app** · Growth · M. A tip jar or supporter unlock through RevenueCat. Never sell data.

## Inbox

Unsorted ideas. Move them into a horizon at the next refresh.

- Remember the Map filter and which Checklist sections are open between launches. From PR #11.
- Let the Map use the Explore filters too (cost, time, level, indoor or outdoor), so the two tabs agree. From PR #11.

## Storage decision

Recommendation: **Supabase** (Postgres with row-level security, Sign in with Apple and Google, Storage for photos), with a small hand-written push/pull of the existing append-only logs. Cloudflare D1 + R2 is the runner-up: cheapest, but more to build. Add PowerSync only if shared plans make conflicts real. Do **Prepare the data for sync** first, whichever backend wins. Offering Google sign-in means also offering Sign in with Apple, and any app with accounts needs in-app account deletion. The full comparison is on the [roadmap page](https://claude.ai/code/artifact/4e24e846-bd46-4e59-b7b8-1c71c340fc67).

## Done

- [x] **Test the storage migrations** · Architecture. Each of the 6 SQLite migrations, catalog aliases and restoring a backup onto an upgraded phone, run against a real SQLite seeded like an older version of the app. A new migration needs a test here. PR #9.
- [x] **One place for header buttons** · UX. Settings moved from the top left of Explore to the top right of every tab, including the Map. PR #11.
- [x] **Do an accessibility pass** · UX. A role on every button, labels where the icon was the only cue, done states read on map rows, the swipe hint and memory ratings readable, and card buttons that go two by two with large text. Swipes already had buttons and screen reader actions. Still to check on a device. PR #8.
- [x] **Set up EAS builds** · Launch. Development, preview and production profiles. PR #2.
- [x] **Add a Google Maps key for Android** · Launch. From the environment, never committed. PR #2.
- [x] **Credit OpenStreetMap and Overture in the app** · Launch. About screen, map label and activity sheet. PR #1.
- [x] **Export and import a backup** · Backend. One JSON file through the share sheet, merged on restore. PR #4.
- [x] **Run lint, typecheck and validate on every pull request** · Architecture. PR #3.
- [x] **Add crash reporting** · Architecture. Sentry, off unless a DSN is set, no personal data. PR #3.
- [x] **Add a friendly crash screen** · Architecture. A "Try again" screen that also reports to Sentry. Roadmap refresh PR.
- [x] **Settings screen, first version** · UX. Weekend ideas could be turned on but never off; now they can. Roadmap refresh PR.
- [x] **Rate-limit the drive-time Worker** · Backend. 30 requests a minute per IP. Roadmap refresh PR.
- [x] **First tests** · Architecture. Jest with tests for days, drive and filters. PR #3.
- [x] **Retheme the app as Dusk Ember** · UX. New palette, open-door icon, WCAG AA text. PR #5.
- [x] **iOS widget** · Feature. Daily idea through expo-widgets.
- [x] **Add Seoul** · Data. 6,282 Overture venues and 11 must-dos, with Korean-aware import rules. Seoul PR.
- [x] **Fill Seattle's and Chicago's hand-picked gaps** · Data. Neighborhoods, a shopping street and local legends. Seoul PR.
