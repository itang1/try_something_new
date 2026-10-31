This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npm run validate            # check data/ for unknown ids, missing icons, and bad values
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Roadmap page

`ROADMAP.md` is the backlog. The [Roadmap page](https://claude.ai/artifact/GaeYbeciXuE4subKBdquBL) (artifact id `7e2bc319-4297-4cad-9526-45be58589527`) is built from it. An artifact can't read GitHub, so the page only changes when a thread republishes it.

1. **In the PR:** if the PR finishes, starts or changes a roadmap item, update `ROADMAP.md` in the same PR (tick it `[x]`, move it to Done with the PR number, pull the next item into Up next). Do this even for data-only or one-file PRs.
2. **After the PR merges**, as the thread's last step, every time `ROADMAP.md` changed:
   1. `git fetch origin main && git checkout --detach origin/main` so the page is built from merged `main`, not the branch.
   2. `npm run roadmap-page` (writes `dist/roadmap.html`; the header records the commit).
   3. `get_artifact` with slug `7e2bc319-4297-4cad-9526-45be58589527` to read the live `version`.
   4. `publish_files` with that `slug`, `base_version` set to the live version, and `files: [{ as: "index.html", path: "<repo>/dist/roadmap.html" }]`. On a version conflict, repeat steps 3 and 4.
   5. Never create a new artifact for the roadmap, and don't use the older "Try Something New Roadmap" artifact `4e24e846-…`: it's a retired page.
3. Say in the thread's final message that the Roadmap page was republished, with the commit it shows.
