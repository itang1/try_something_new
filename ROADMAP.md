# Try Something New: Roadmap

The single list of what to build next. It replaces `TODO.md`. Last refreshed 2026-10-31, against `main` at `7256db5`. Growth items come from [MARKETING.md](MARKETING.md), the marketing and launch plan.

At a glance: the [Roadmap page](https://claude.ai/artifact/GaeYbeciXuE4subKBdquBL) shows Up next, what's in progress, decisions and the inbox.

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

**Keeping the Roadmap page fresh:** the [Roadmap page](https://claude.ai/artifact/GaeYbeciXuE4subKBdquBL) is built from this file, and an artifact can't read GitHub when you open it, so it only changes when someone republishes it. Any thread whose merged PR changed `ROADMAP.md` does this as its last step: on up-to-date `main`, run `npm run roadmap-page` (writes `dist/roadmap.html`), then publish that file as a new version of artifact `7e2bc319-4297-4cad-9526-45be58589527` (publish_files with `slug` and the live `base_version` from get_artifact). Don't create a new artifact. The page's header shows the commit it was built from, so a stale page is easy to spot.

**Refreshing:** every few weeks, or after a batch of PRs merges, re-check statuses against merged PRs, re-order Up next, and update the date at the top.

**Working on it with Claude, cheaply**

- One item per thread. From the project chat, say something like: *"Start a thread for the next item in ROADMAP.md's Up next."* or *"Do 'Run expo-doctor in CI' from ROADMAP.md."* The item's line is the whole brief, so the thread doesn't need to re-read the repo to decide what to build.
- Batch S items that touch the same area into one thread and one PR ("Do the three Data S items in Next").
- Ask for a plan first on L and XL items, and split them into M items here before building.
- Keep the thread focused: merge or close its PR, then start a fresh thread for the next item instead of continuing a long one.
- When credits run low: pick the item yourself, and run Claude Code locally in this repo with the same prompt. `AGENTS.md` and this file give it the same context.

## Up next

In order. These are the ones to start a thread on.

1. [~] **Optional account with cross-device sync** · Backend · L. Backend, sync client, sign-in and Back up and sync in Settings are in (PR #32). Left: **Turn on Apple and Google sign-in in the dashboards** (needs you; exact steps in `supabase/README.md` under Dashboard setup), then **Sync automatically** (on launch and when the app comes back, so Sync now is rarely needed), and **Back up memory photos**.
2. [ ] **Check merged work on a real phone** · Launch · S. Backup share sheet and file picker, Sentry, the Dusk Ember theme in light and dark, the splash and Android themed icon, the map credit label, the new Settings and crash screens, the tab headers and filters, at-home crafts and the Where picker, the "tried it" share card (after Save, and from Memories; post one to an Instagram story to see it full size), the rating prompt after closing the card for a "Loved it", and the accessibility pass (VoiceOver, TalkBack and the largest text size). None of these has run on a device yet. Needs you and a development build.
3. [ ] **Finish Seoul's parks and trails** · Data · S. Needs your computer: the cloud can't reach Overpass. Run `node scripts/import-osm.mjs seoul 37.19,126.5,37.95,127.46` and commit the result. Overture has few parks and no bike routes there, so Seoul's outdoors list is mostly hand-picked until then.
4. [ ] **Remind on a plan's day** · Feature · S. A local notification the morning of a planned activity, using the weekend ideas notification setup.
5. [ ] **Build the Android widget** · Feature · M. expo-widgets covers iOS only. Add a Glance widget through a config plugin that shows the same daily idea.
6. [ ] **Use the app without a city** · Feature · M. Someone outside the 5 cities, or who skips location, should still get at-home and host-friends ideas instead of an empty Explore.

## Now: before launch

- [~] **Add a Settings screen** · UX · M. Weekend ideas on/off, backup, credits, version and a Send feedback email (PR #21) are in. Left: a privacy policy link, once **Write the privacy policy and store forms** has a page. Miles or kilometers is dropped for now: the app shows drive minutes, never distances.
- [~] **Make the tabs easier to get around** · UX · M. PR #11: one header pattern on every tab (the tab's own filter or sort button, then Settings, always top right), Map filters for Not done, Done, Saved and kind, a Checklist grouped by kind with folding sections, and Memories opened from the progress card. Left: check it on a phone.
- [~] **Protect the drive-time Worker** · Backend · S. Per-IP rate limiting is in, and goes live on the next `npx wrangler deploy`. Left: App Attest / Play Integrity once the app is in the stores.
- [ ] **Check merged work on a real phone** · Launch · S. See Up next.
- [~] **Optional account with cross-device sync** · Backend · L. Sign-in and sync in Settings done; dashboard setup left. See Up next.
- [ ] **Finish Seoul's parks and trails** · Data · S. See Up next.
- [ ] **Build the Android widget** · Feature · M. From the old TODO.
- [ ] **Finish the release setup** · Launch · S. Needs your accounts: `eas init`, EAS environment variables, Apple and Play developer accounts, then EAS Update with a fingerprint runtime version. Steps are in PR #2's description and the README.
- [ ] **Test on a cheap Android phone** · Launch · S. Cold start, parsing the Los Angeles file, and the map with every pin. The map spike only ran in the iOS Simulator.
- [ ] **Decide on iPad** · UX · S. `supportsTablet` is on, so Apple will review it on iPad. Either give the main screens two columns or turn tablets off for launch.
- [ ] **Write the privacy policy and store forms** · Launch · S. A short page on GitHub Pages, App Store privacy labels, Play Data safety. Say that a rounded location goes to the drive-time Worker and that crash reports carry no personal data.
- [ ] **Make the store listing and demo video** · Growth · M. Screenshots per platform, a short description built on "one idea at a time", and a demo video made with brag. Use the name, subtitle and keywords in MARKETING.md section 6, and real shared cards from the beta. From the old TODO.

**Marketing and launch** (see [MARKETING.md](MARKETING.md))

- [ ] **Claim the handles and check the store name** · Growth · S. Needs you. The name stays "Try Something New" (decided 2026-10-31). Claim the same handle on TikTok and Instagram, check the name is available in both stores, and pick a store subtitle (see MARKETING.md section 6). Also decided: launch in Los Angeles starting with Pasadena, $0 budget for now, TikTok first with the same videos on Instagram Reels.
- [?] **Set the launch date** · Growth · S. Recommended: early January, for "try new things" New Year's resolutions, with a beta in November and December.
- [ ] **Start a beta with a waitlist** · Growth · S. A one-page site with an email signup, TestFlight and Play internal testing, 50 to 200 testers mostly in the launch city. Needs **Finish the release setup**.
- [ ] **Invite links that open the idea** · Growth · M. "Invite a friend" and the share cards link to a small web page per activity with store buttons, which opens the same idea in the app when it's installed (universal and app links). The link carries the kind of share, never who sent it, and the Worker counts visits and store taps. Put the short link in the share card's corner by setting `SHARE_LINK` in `src/data/share-card.ts`.
- [ ] **Remind on a plan's day** · Feature · S. See Up next.
- [ ] **Opt-in, privacy-friendly analytics** · Growth · S. Moved up from Next so the beta can measure activation (planned or done in the first 7 days), week 2 and 4 retention, and shares per memory. Anonymous counts with TelemetryDeck or Aptabase, off by default.
- [ ] **Post the weekend video series** · Growth · M. Needs you. "My app picked my weekend" short videos, 3 a week from the beta on, on TikTok and Instagram Reels. Plan in MARKETING.md section 5.
- [ ] **Launch publicly** · Growth · M. Waitlist email, founder video, city subreddit posts within each sub's rules, local creators and newsletters, and Product Hunt on a weekday, the same week. Launch kit and order in MARKETING.md sections 5 and 9.

## Next: 1 to 3 months after launch

**Location-agnostic and at-home ideas** (building on PR #6)

- [ ] **Use the app without a city** · Feature · M. See Up next.
- [ ] **Draw custom icons for crafts** · UX · S. The activities without a Material Symbol, mostly crafts, in the same style.

**Accounts and sync**

- [~] **Optional account with cross-device sync** · Backend · L. Sign-in and sync in Settings done; see Up next. "Back up and sync" in Settings with Sign in with Apple or Google, push and pull the logs, merge by latest event, in-app account deletion. Recommended backend: Supabase (see Storage decision below). From the old TODO.
- [ ] **Back up memory photos** · Backend · M. The private `photos` bucket is ready, one folder per account. Resize to about 1600 px, upload on Wi-Fi in the background, keep the local copy as the one shown.

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
- [ ] **Show kilometers outside the US** · UX · S. Default to kilometers for cities like Seoul, alongside a miles or kilometers setting. Only needed once the app shows distances; today it shows drive minutes.
- [ ] **English names for Seoul places** · Data · M. Overture only has Korean names there. Options: OpenStreetMap's `name:en` (comes with the OSM import), or the Korea Tourism Organization's English TourAPI, which needs a free key from data.go.kr.
- [ ] **Add more cities** · Data · M. The 25 largest US metros, then a few international ones. Re-import monthly from a scheduled Action.
- [ ] **Show opening hours where known** · Data · M. OpenStreetMap `opening_hours`, an "Open now" badge, never hiding places without hours.
- [ ] **Wheelchair and stroller access** · Data · S. Read OpenStreetMap's `wheelchair` tag and add an "Accessible" filter.
- [ ] **Report a place through a form** · Data · S. A Worker endpoint that opens a GitHub issue with the place id, instead of email.

**Growth after launch**

- [ ] **Share your city bucket list** · Growth · S. The checklist as a poster image with done items lit up, from the progress card.
- [ ] **Year in review** · Feature · M. A story-style recap each December: things tried, kinds, favorite memory, photos. Builds on the monthly recap; share as cards.
- [ ] **Make a kit for local partners** · Growth · S. A "Featured on Try Something New" sticker and poster with a QR code, and a page per partner that opens their activity. For studios, gyms, run clubs and cafés in the launch city.
- [ ] **Web pages for each city** · Growth · L. Moved up from Later: "Things to try in Seattle" pages built from the catalog, for search, Reddit and partners. Start with the launch city's page only (S), then the rest.
- [ ] **Hold a monthly try-along** · Growth · S. Needs you. Everyone tries the same idea in a month and shares cards; partners join in. Later, a gallery of shared cards.
- [ ] **Launch in a second city** · Growth · M. Once the first city's activation and share rate look good. Pick it from installs and requests; repeat the city launch kit.
- [ ] **Launch in Seoul with a Korean listing** · Growth · M. Korean store listing and screenshots, Korean-language posts on Instagram, Threads and Naver blogs. Needs **English names for Seoul places** and **Directions in Korea** first.

## Later: once people stick around

- [ ] **Shared plans with "I'm in"** · Feature · L. A web page per plan with add-to-calendar and an RSVP. Needs the backend and push.
- [ ] **Friends and couples mode** · Feature · XL. A shared checklist with a partner or group.
- [ ] **Siri, App Shortcuts and lock screen widgets** · Feature · M. "Give me an idea" by voice, StandBy widgets, a Live Activity on a plan's day.
- [ ] **Translate the app** · Growth · L. Spanish first, with local units and prices.
- [ ] **Trip planner** · Feature · M. Turn trip mode into a day-by-day weekend plan.
- [ ] **Community tips per place** · Data · XL. Only with a moderation plan.
- [ ] **Seasonal events layer** · Feature · L. Festivals and seasonal openings as an optional extra.
- [ ] **A way to support the app** · Growth · M. A tip jar or supporter unlock through RevenueCat. Never sell data.

## Inbox

Unsorted ideas. Move them into a horizon at the next refresh.

- Let the Map use the Explore filters too (cost, time, level, indoor or outdoor), so the two tabs agree. From PR #11.

## Storage decision

Recommendation: **Supabase** (Postgres with row-level security, Sign in with Apple and Google, Storage for photos), with a small hand-written push/pull of the existing append-only logs. Cloudflare D1 + R2 is the runner-up: cheapest, but more to build. Add PowerSync only if shared plans make conflicts real. Do **Prepare the data for sync** first, whichever backend wins. Offering Google sign-in means also offering Sign in with Apple, and any app with accounts needs in-app account deletion. The full comparison is on the [roadmap page](https://claude.ai/code/artifact/4e24e846-bd46-4e59-b7b8-1c71c340fc67).

## Done

- [x] **Add Back up and sync to Settings** · Backend. Optional, signed out by default. Sign in with Apple (the system sheet on iPhone, the browser on Android) or Google (the browser, with the web client id), then Sync now with the last sync time, Sign out (keeps local data, resets the sync marks) and Delete account through the `delete-account` function. Supabase URL and publishable key now ship in `.env`. Adds expo-apple-authentication, expo-web-browser and expo-crypto, so it needs a new development build. PR #32.
- [x] **Ask for a rating at a happy moment** · Growth. The system review prompt (expo-store-review) when the share card closes after a "Loved it", shared or not, at most once every 120 days. Never on launch or after "Not for me". Adds a native module, so it needs a new development build. PR #27.
- [x] **Add the sync client** · Backend. `sync()` in `src/data/sync.ts` pushes `changesSince` in pages and pulls each table by `(updated_at, id)` into `applyChanges`, saving each cursor only after its step succeeds. Uses `@supabase/supabase-js`, with the session kept in the SQLite key-value store. Nothing calls it until sign-in lands. PR #27.
- [x] **Share a "tried it" card** · Growth. After Save on the done sheet, and from a share button on each memory: an image card with your photo (or the activity's colors), the activity's icon and name, the place, "Loved it", "#12 in Seattle" and the app's name, in story (1080×1920) and square (1080×1080) sizes, through the share sheet. Adds react-native-view-shot, so it needs a new development build. The short link waits for **Invite links that open the idea**. PR #26.
- [x] **Set up Supabase for sync** · Backend. Project "Try Something New" (free plan, us-west-1). Tables mirror the synced SQLite tables with `owner_id` and a server `updated_at`, row-level security per account, a private photos bucket, and a `delete-account` Edge Function. Schema in `supabase/migrations`, keys and setup in `supabase/README.md`.
- [x] **More broad ideas like crafts** · Data. "Cook something new" (dumplings, sushi, kimchi, tortillas, no-churn ice cream, plus bread, pasta and cooking classes) and "Learn a new skill" (a language, chess, sign language, a card trick, juggling, first aid, code, plus music lessons), on the same parent model as "Try a new craft". PR #19.
- [x] **More at-home and DIY versions** · Data. Home versions for 12 more activities and an "anywhere" option for 11 in PR #16, then four new home-only crafts under Try a new craft (Carve a block print, Build a terrarium, Bind a notebook, Press flowers) in PR #22.
- [x] **Remember the Map filter and Checklist sections** · UX. The Map's status and kind filter, and the Checklist's filter, sort, grouping and open sections, stay the same after the app restarts. From the Inbox. PR #21.
- [x] **Send feedback from Settings** · UX. An email with the app version and platform filled in, shown when the report address is set. PR #21.
- [x] **Store places in indexed SQLite tables** · Architecture. Migration 8 moves each downloaded city out of its JSON blob into `catalog_places` and `catalog_place_activities`, indexed by position, activity and place id, with the city's own fields in a small `catalog_cities` row. Launch now reads only those small rows for aliases and the nearest city, and loads just the city in use instead of parsing every downloaded one. Drive times take the nearest places from a growing bounding box, and Memories reads only the places it needs from other cities. The bundled city is seeded into the same tables. Left: the Map still clusters the whole city in memory. PR #18.
- [x] **Offer Host friends in the Where picker** · UX. The Explore card's Change list ends with Host friends wherever an activity has it, with an Invite button. PR #14.
- [x] **Run expo-doctor in CI** · Architecture. Plus the Expo package patch versions it asked for. PR #12.
- [x] **Change where to do an idea on the Explore card** · UX. Pick at home, a nearby place or a maps search right on the card. PR #10.
- [x] **Suggest at-home crafts and broad ideas** · Feature. A "Try a new craft" parent with 16 kinds, studio or DIY on each card, and Stay in leading with the home version. PR #6.
- [x] **Check off the at-home way** · UX. One "Where to do it" list with At home first, each row with the same checkmark. PR #6.
- [x] **Count a specific craft toward "Try a new craft"** · Feature. Doing any kind checks off the broad idea once. PR #6.
- [x] **Prepare the data for sync** · Architecture. Every row gets a UUID made on the phone and the id of the device that made it, saved and hidden ideas are event logs like the rest, the latest event by time wins, and `changesSince` / `applyChanges` in `src/data/storage.ts` are where sync plugs in. Migration 7, with tests. PR #15.

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
