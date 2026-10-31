# Store listing kit

Written 2026-10-31 for the public launch in early January 2027: Los Angeles, starting with Pasadena, with the New Year angle. Everything in a `text` block is ready to paste. The number after each field is its length in characters, counted with a script; every field here is plain ASCII except where noted, so characters and bytes match.

**Where the limits come from.** Apple's limits were checked on 2026-10-31 against App Store Connect Help ([Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information), [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications), [App preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications)). Google's short description, feature graphic and screenshot rules were checked against [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151). The App Store name and subtitle limits (30 each), the Play title (30) and full description (4000), and the Play release notes limit (500) are from memory: check them in the consoles when you paste.

**What the app does today, so the copy stays true.** Explore shows one idea card at a time (swipe right to save, left to skip, "Not for me" to hide). Each idea shows the closest places, sorted by drive time from your home, or how to do it at home. You can pick a day, invite a friend and add the plan to your calendar. After you go, you rate it (Loved it, It was fine, Not for me), add a note and a photo, and share a "tried it" card. Checklist tracks what you've tried in your city, Memories shows them as a timeline, and Map shows every place. There is an iOS "Idea for Today" widget and an opt-in Thursday weekend idea. No account, no ads, works offline. The data has 122 activities (README and MARKETING still say 102; the copy below says "more than 100" so it stays true either way) and about 650 places within 6 km of central Pasadena.

## 1. App Store

### Name and subtitle (30 characters each)

The name and subtitle are the two most heavily weighted search fields, so they should hold the biggest searches: "things to do" and "date ideas". MARKETING.md section 6 suggested "Try Something New: Things to Do" and "Date ideas, hobbies, bucket list", but those are 31 and 32 characters, one and two over the limit.

| Option | Name | Subtitle |
| --- | --- | --- |
| **A (recommended)** | `Try Something New: Date Ideas` (29) | `Things to do, one at a time` (27) |
| B | `Try Something New: Local Ideas` (30) | `Weekend plans and date ideas` (28) |
| C | `Try Something New` (17) | `Things to do near you` (21) |

**Why A.** It puts both big searches ("date ideas" and "things to do") in the top two fields, and the subtitle carries the promise ("one at a time"). B is softer on "things to do", which is the largest search. C reads cleanest but leaves 13 characters of the most valuable field unused. If Apple says the name "Try Something New" alone is taken, A and B still work because the full string is what has to be unique.

### Promotional text (170)

Can be changed any time without review, so use it for the season. Swap it after January.

```text
New Year, new things. Try 52 of them in 2027, starting in Pasadena: one idea at a time, the closest place to do it, and a checklist that grows. No account, no ads.
```

163 of 170 characters.

### Description (4000)

Plain text, no HTML. Only the first three lines show before "more", so they carry the promise.

```text
Stuck doing the same things every weekend? Try Something New gives you one idea at a time, shows the closest place to do it, and keeps a checklist of everything you've tried in your city.

No feed to scroll and no events that expire. Just a card: pottery class, waterfall hike, flea market, afternoon tea. Swipe right to save it, left to skip it.

NOW IN LOS ANGELES, STARTING WITH PASADENA
Hundreds of real places around Pasadena, from Eaton Canyon Falls and the Rose Bowl Flea Market to the Huntington, Norton Simon Museum and Old Pasadena, plus thousands more across LA. Also in Seattle, Chicago, Columbus and Seoul.

HOW IT WORKS
- One idea at a time. More than 100 activities, most of them free or cheap. Easy ideas come first, and bigger stretches wait until you've tried a few.
- The closest place first. Places are sorted by drive time from your home, so the suburbs get what's near them, not just downtown.
- Or do it at home. Many ideas come with an at-home version, like making fresh pasta or tie-dyeing a shirt.
- Pick a day. Add the plan to your calendar and invite a friend. Plans made with someone are easier to keep.
- Look back. Rate what you tried, add a note and a photo, and see it all in Memories.
- Share what you tried. Turn a memory into a card for your story or a friend.
- Your city checklist. Watch the number of things you've tried grow.

YOUR CHOICE
Filter by kind, cost, time, level, drive time, indoors or outdoors, and who's coming. Tap "Not for me" on anything you'd never do. Add your own ideas to the list.

A NEW IDEA EVERY DAY
Add the Idea for Today widget to your home screen, or turn on one weekend idea every Thursday.

PRIVATE BY DEFAULT
No account, no ads, no tracking. Your plans, memories and photos stay on your phone, and the app works offline. No streaks, no guilt.

Place data from OpenStreetMap and Overture Maps.
```

1,862 of 4,000 characters.

### Keywords (100 bytes)

Comma-separated with no spaces after commas. Apple already indexes the name and subtitle, so none of these repeat a word from option A (try, something, new, date, ideas, things, to, do, one, at, a, time). Apple combines words across fields, so "weekend" here plus "ideas" in the name covers "weekend ideas", and "night" covers "date night".

```text
weekend,hobby,bucket list,nearby,fun,bored,local,pasadena,los angeles,couples,activities,night
```

94 of 100 bytes.

If you pick option B or C, rebuild this list so it doesn't repeat that option's words, and add "date" or "things to do" back in where they're not in the name or subtitle. Swap "pasadena,los angeles" for the next city's names when it launches.

### What's New

Apple doesn't show What's New for the first version of an app, so 1.0 needs none. Use this for the first update (1.0.1), and keep each later one just as human (MARKETING.md section 6).

```text
Thanks for trying Try Something New. This update fixes bugs found in the first week and makes the app a little faster. Tell us what you tried: it shapes what comes next.
```

169 of 4,000 characters.

### Category

- **Primary: Lifestyle.** Date ideas, hobbies and a bucket list are Lifestyle searches, and the chart there is easier to climb than Travel.
- **Secondary: Travel.** That's where "things to do" apps are browsed.

### Age rating

Apple's questionnaire now produces 4+, 9+, 13+, 16+ or 18+ (check the current wording in App Store Connect). Answer it honestly:

- **Alcohol, tobacco or drug use or references: Infrequent or mild.** One activity is "Do a tasting at a brewery or winery", and bars or wineries can show up as places. This answer is likely to make the rating 13+. That's fine for this app.
- **Everything else: None** (violence, sexual content, horror, gambling, medical or wellness treatment, contests).
- **Unrestricted web access: No.** Links open in Safari or Maps, not an in-app browser.
- **User-generated content or messaging: No.** Notes and photos stay on the phone and aren't shown to other people in the app; sharing goes through the system share sheet.
- **Made for Kids: No.**

## 2. Google Play

Play rules for the short description, screenshots and feature graphic ban promotional words like "Best", "#1", "Top", "New", "Free" and "Sale". "New" in the app's own name is fine, but don't use it, or "free", anywhere else in those assets.

### Title (30)

```text
Try Something New: Date Ideas
```

29 characters. Same as the App Store option A, so search and word of mouth match.

### Short description (80)

```text
Things to do near you, one idea at a time, with a checklist of what you tried
```

77 characters. No emoji, no closing period (Play asks for none on a single sentence).

### Full description (4000)

Play indexes the full description for search, so this version repeats the main phrases (things to do, date ideas, weekend, hobbies, bucket list, Pasadena, Los Angeles) a little more than the App Store one, in normal sentences.

```text
Stuck doing the same things every weekend? Try Something New gives you one idea at a time, shows the closest place to do it, and keeps a checklist of everything you've tried in your city.

It's not an events app and not a review site. It's a card with one thing to try: a pottery class, a waterfall hike, a flea market, afternoon tea. Swipe right to save it, left to skip it. Finding things to do takes seconds instead of an evening of scrolling.

NOW IN LOS ANGELES, STARTING WITH PASADENA
Hundreds of real places around Pasadena, from Eaton Canyon Falls and the Rose Bowl Flea Market to the Huntington, Norton Simon Museum and Old Pasadena, plus thousands more across Los Angeles. Also in Seattle, Chicago, Columbus and Seoul.

THINGS TO DO, ONE IDEA AT A TIME
More than 100 activities, most of them free or cheap: hikes, museums, cooking classes, climbing, karaoke, board game cafes, stargazing and crafts. Easy ideas come first, and the bigger stretches wait until you've tried a few.

THE CLOSEST PLACE FIRST
Places are sorted by drive time from your home, so you see what's close to you, not just what's downtown. Open directions in one tap.

DATE IDEAS AND WEEKEND PLANS
Pick a day, add it to your calendar and invite a friend. Plans made with someone are easier to keep, and the app makes a good list of date ideas.

OR DO IT AT HOME
Many ideas come with an at-home version, like making fresh pasta, folding dumplings or tie-dyeing a shirt.

YOUR CITY BUCKET LIST
A checklist of what you've tried in your city, with a number that grows. Rate each one, add a note and a photo, and look back on them in Memories. Turn a memory into a card to share with friends.

HOBBIES, YOUR WAY
Filter by kind, cost, time, level, drive time, indoors or outdoors, and who's coming. Tap "Not for me" on anything you'd never do, and add your own ideas to the list. Turn on one weekend idea every Thursday if you'd like a nudge.

PRIVATE BY DEFAULT
No account, no ads, no tracking. Your plans, memories and photos stay on your phone, and the app works offline. No streaks and no guilt.

Place data from OpenStreetMap and Overture Maps.
```

2,123 of 4,000 characters.

### Release notes for 1.0 (500)

```text
The first public version. One idea at a time, the closest place to do it, and a checklist of everything you try. Starting in Pasadena and Los Angeles.
```

150 of 500 characters.

### Category and tags

- **Category: Lifestyle**, to match the App Store. Travel & Local is the alternative if Lifestyle proves crowded.
- **Tags:** Play Console lets you pick up to 5 from its own list (Store presence, then Store settings). Pick the closest to: things to do, local, lifestyle, hobbies, dating or outdoor. The list changes, so choose in the console.
- **Contains ads: No.** **In-app purchases: No.**
- **Target audience: 18 and over** (or 13 and over). Don't include under-13s, which brings in the Families policy. Many activities are kid-friendly, but the app is written for adults.
- **Content rating (IARC questionnaire):** answer the alcohol reference question yes (the brewery or winery tasting), everything else no. Expect a low teen-level rating at most.

## 3. Screenshots

The first three do most of the work. Use one look for every frame: the caption at the top on the Dusk Ember background, the phone screen below. Same seven frames on both stores. Captions avoid "new" and "free" because of Play's rules.

| # | Screen | State to show | Caption (characters) |
| --- | --- | --- | --- |
| 1 | Explore | The card "Hike to a waterfall" with Eaton Canyon Falls as its place, the drive time showing, mid-swipe to the right if you can catch it. | One idea at a time (18) |
| 2 | Activity detail | "Take a pottery class": the list with Color Me Mine Pasadena and Clayworks Studio Altadena at the top, with drive minutes. | The closest place first (23) |
| 3 | Share card (story) | The "tried it" card for "Hunt for treasure at a flea market" at Rose Bowl Flea Market, a real photo from the beta, "Loved it", "#12 in Los Angeles". | Share what you tried (20) |
| 4 | Checklist | Grouped by kind, about 12 tried, with the progress card at the top. Done items should include Visit an art museum (Norton Simon Museum), Stroll a botanical garden (Huntington Library & Gardens) and Browse an indie bookstore (Vroman's Bookstore). | Your city, checked off (22) |
| 5 | Plan sheet | "Stroll a botanical garden" at Huntington Library & Gardens, this Saturday, with Invite a friend and Add to my calendar visible. | Pick a day, bring a friend (26) |
| 6 | Map | Centered on Old Pasadena, pins across Pasadena and Altadena, one card open on Pasadena Ice Skating Center. | See what's near you (19) |
| 7 | Memories | The timeline with three or four memories with photos and notes, including the flea market one from frame 3. | Look back on what you tried (27) |
| 8 (optional) | Explore, at home | "Make fresh pasta by hand" with "Where: at home" and its supplies line. | Ideas for a night in (20) |

The share card says the city name, which is "Los Angeles" for Pasadena places, because Pasadena is part of the Los Angeles data. Use real photos from beta testers who agreed in writing, or your own.

### Sizes

**App Store** (up to 10 per size, PNG or JPEG, no transparency):

- **iPhone 6.9" (large Dynamic Island): 1320 x 2868** from the iPhone 17 Pro Max simulator. Apple also accepts 1290 x 2796 and 1260 x 2736.
- **iPhone 6.3" (medium Dynamic Island): 1206 x 2622** from the iPhone 17 Pro simulator. As of today, Apple's page lists this size as the required one for iPhone, so upload both sets.
- **iPhone 6.5": not needed.** It's only required when there's no 6.9" set.
- **iPad 13": 2064 x 2752, only if `supportsTablet` stays on.** The roadmap's open "Decide on iPad" item settles this. If tablets stay on, Apple reviews the app on iPad and needs at least one iPad screenshot. If they go off, skip iPad entirely. Recommendation for launch: turn tablets off unless the two-column layout is done.

**Google Play:**

- **Phone screenshots:** 2 to 8, PNG or JPEG with no alpha. Use 1080 x 1920 or larger at 9:16 (four or more at 1080 px or more makes the listing eligible for Play's promotion spots). The emulator's own size works if it's 9:16 or close; the long side can't be more than twice the short side.
- **Feature graphic: 1024 x 500**, JPEG or 24-bit PNG with no alpha. The app icon, the name and "One idea at a time" on the Dusk Ember gradient, with a few activity icons. Keep text away from the edges and avoid pure white or black backgrounds.
- **App icon: 512 x 512** PNG (from `npm run app-icons` output).

### How to capture

Use a development build (`development-simulator` profile for iOS, `development` for Android) with the release environment, so real drive times show. A fresh simulator keeps the data clean.

1. **Set up the state by hand:** set home to a Pasadena address (for example near Colorado Boulevard in Old Pasadena), use Quick start to mark the done items, save memories with photos and notes, and make the plan for frame 5. Use light mode for all frames.
2. **iOS Simulator:**
   ```bash
   xcrun simctl location booted set 34.1478,-118.1445
   xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularMode active --cellularBars 4 --wifiBars 3 --operatorName ''
   xcrun simctl io booted screenshot frame1.png
   xcrun simctl status_bar booted clear
   ```
3. **Android emulator** (a Pixel image with Google Play):
   ```bash
   adb emu geo fix -118.1445 34.1478
   adb shell settings put global sysui_demo_allowed 1
   adb shell am broadcast -a com.android.systemui.demo -e command enter
   adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
   adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
   adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
   adb exec-out screencap -p > frame1.png
   adb shell am broadcast -a com.android.systemui.demo -e command exit
   ```
4. Put the captions on in Figma, Canva or similar, with one template per size, and export at the exact sizes above.

## 4. App preview and demo video

### App Store preview

Apple's rules: 15 to 30 seconds, up to 3 per size, H.264 .mov, .m4v or .mp4, at most 30 fps and 500 MB, portrait **886 x 1920** for the large iPhone sizes. It has to be footage of the app itself; no hands, people or devices around it. The poster frame defaults to 5 seconds in, so make second 5 a strong frame (the Explore card).

Record with `xcrun simctl io booted recordVideo --codec=h264 preview.mov`, then cut and scale to 886 x 1920 at 30 fps.

| Time | Shot | On-screen text |
| --- | --- | --- |
| 0:00 to 0:04 | Explore opens on "Hike to a waterfall", Eaton Canyon Falls. | Stuck in a weekend rut? |
| 0:04 to 0:09 | Swipe left past one card, right on "Take a pottery class". | One idea at a time |
| 0:09 to 0:13 | The activity's place list: Color Me Mine Pasadena, drive minutes. | The closest place first |
| 0:13 to 0:17 | Plan sheet: pick Saturday, tap Invite a friend. | Pick a day |
| 0:17 to 0:22 | Done sheet: "Loved it", add a photo, Save. Confetti. | Go, then look back |
| 0:22 to 0:27 | The "tried it" card slides up, Story size. | Share what you tried |
| 0:27 to 0:30 | Checklist progress ticks up by one. App name. | Try Something New |

### As the first TikTok

Cut a 9:16, 1080 x 1920 version of the same idea in the founder voice (MARKETING.md section 5): "I let my app pick my weekend." Open on the real Explore card (screen recording), cut to phone footage of you at the real place (Color Me Mine, or Eaton Canyon Falls), then the share card and the honest verdict. 20 to 40 seconds, captions burned in, sound on. People and hands are fine here, unlike the App Store preview. The roadmap item suggests making it with brag; any editor works. The same file goes to Instagram Reels and later YouTube Shorts. The Play listing can link a YouTube version of the App Store preview as its promo video.

## 5. Privacy answers

Drafted from the code as of commit 2c02b83. Re-check them against the build you submit.

**What actually leaves the phone today:**

- **Location, for drive times.** The app sends the home (or trip start) point and up to 25 nearby place ids to the drive-time Worker (`src/data/routing.ts`, `server/drive-times`). The Worker rounds the point to 2 decimals (about 1 km) before calling OpenRouteService and caching the answer on Cloudflare for 30 days. It keeps no log. Note that the phone sends the point unrounded today; rounding it on the phone too (the same `toFixed(2)` the app already uses for its cache key) would make the "coarse" answer below true end to end. That's a one-line change for the app thread, not this file. Location is optional: without it the app shows at-home ideas and straight-line estimates. Cloudflare sees the IP address for per-IP rate limiting and doesn't store it.
- **Crash reports and performance** through Sentry, release builds only (`src/crash-reporting.ts`): crash stack traces, device model and OS, and a 20% sample of screen timings. `sendDefaultPii` is off, so no user details are attached. In Sentry's project settings, turn on "Prevent storing of IP addresses" so the server side matches.
- **Opt-in anonymous usage counts** (`app_events` in `supabase/migrations/20261031200000_growth_counts.sql`): an event name, platform, app version and days since install. No device id, account or location. Off unless the person turns it on.
- **Nothing else.** Plans, memories, notes, photos, ratings and the checklist stay on the phone. Calendar entries are written to the phone's calendar. Shares go through the system share sheet. The account and sync code (`src/data/sync.ts`) exists but nothing calls it until sign-in ships. No ads, no ad SDKs, no tracking.

### App Store privacy label

- **Do you or your partners collect data? Yes.**
- **Tracking: No** for every type.

| Data type | Collected | Linked to the user | Used for tracking | Purposes |
| --- | --- | --- | --- | --- |
| Location: Coarse Location | Yes | No | No | App Functionality |
| Diagnostics: Crash Data | Yes | No | No | App Functionality |
| Diagnostics: Performance Data | Yes | No | No | App Functionality |
| Usage Data: Product Interaction | Yes (opt-in) | No | No | Analytics |

Everything else: not collected. Apple counts data as collected when it leaves the device and is kept longer than it takes to answer the request. The precise point is used only for the request; the rounded point is cached, which is why the answer is Coarse Location.

**Changes when sign-in ships** (mark these in the label the same day):

- Contact Info: Email Address, linked, App Functionality (Sign in with Apple may give a relay address; Google gives the real one).
- Identifiers: User ID, linked, App Functionality.
- User Content: Other User Content (plans, ratings, notes, checklist), linked, App Functionality.
- User Content: Photos or Videos, linked, App Functionality, once **Back up memory photos** ships.
- The privacy policy has to describe account deletion, which already exists in the `delete-account` Edge Function and must be reachable in the app.

### Google Play Data safety

- **Does your app collect or share any of the required user data types? Yes.**
- **Is all user data encrypted in transit? Yes** (HTTPS to the Worker, Sentry and Supabase).
- **Do you provide a way for users to request that their data is deleted?** No for now, because nothing collected is tied to a person. **Changes with sign-in:** Yes, in the app and through a web page you list in the console (Play requires the web link for apps with accounts).
- **Shared with third parties: none.** Sentry, Cloudflare and Supabase act as service providers, which Play doesn't count as sharing.

| Data type | Collected | Shared | Processed ephemerally | Required or optional | Purposes |
| --- | --- | --- | --- | --- | --- |
| Location: Precise location | Yes | No | No | Optional | App functionality |
| App info and performance: Crash logs | Yes | No | No | Required | App functionality |
| App info and performance: Diagnostics | Yes | No | No | Required | App functionality, Analytics |
| App activity: App interactions | Yes | No | No | Optional | Analytics |

Play calls a location "approximate" only when it's no more precise than about 3 square kilometers. The Worker's 2-decimal rounding is about 1 square kilometer, so Play's honest answer is Precise location, even after the phone rounds too.

**Changes when sign-in ships:** Personal info: Email address and User IDs (collected, required for an account, App functionality, Account management). Photos and videos once photo backup ships. App activity: Other user-generated content for synced plans, notes and ratings. All not shared.

## 6. Checklist for you

**Decide**

- [ ] Pick the name and subtitle (recommended: option A, "Try Something New: Date Ideas" with "Things to do, one at a time").
- [ ] Decide on iPad for launch (recommended: turn `supportsTablet` off unless two columns are done). This sets whether you need iPad screenshots.
- [ ] Confirm the launch date, which fixes the promotional text's "2027".
- [ ] Approve the privacy answers above, and ask the app thread to round the location on the phone before sending it.

**Check and claim**

- [ ] Create the app record in App Store Connect with the chosen name; that's the real availability check, and it holds the name.
- [ ] Search Google Play for the title and similar names to avoid confusion.
- [ ] Claim matching handles on TikTok, Instagram, Threads, X and YouTube. If `@trysomethingnew` is taken, use the same fallback everywhere (for example `@trysomethingnew.app` or `@trysomethingnewapp`).
- [ ] Apple Developer Program ($99 a year) and Google Play developer account ($25 once), plus the release setup on the roadmap.

**Prepare**

- [ ] Privacy policy page and support page URLs (both stores require a privacy policy URL; Apple requires a support URL). See the roadmap item **Write the privacy policy and store forms**.
- [ ] Set "Prevent storing of IP addresses" in Sentry.
- [ ] Real "tried it" photos and quotes from beta testers, with permission, for frames 3 and 7.
- [ ] Capture the screenshots, make the feature graphic, record the preview, and paste everything above.
- [ ] Update the "102 activities" proof point in README and MARKETING.md to match the data (122 today).
- [ ] After the launch rush, swap the promotional text and the keywords' city names as needed.
