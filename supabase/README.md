# Supabase

The backend for the optional account and cross-device sync. The sync client is in `src/data/sync.ts` (with the
client itself in `src/data/supabase.ts`). Sign-in, sync now, sign out and account deletion are in `src/data/account.ts`
and the "Back up and sync" section of Settings. Signing in is optional; the app works the same without it.

- **Project:** Try Something New, in the Poodle Strategy organization. URL: https://fueiospwqwukvqmwcfrn.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/fueiospwqwukvqmwcfrn

## What's here

- `migrations/` is the database schema, applied in order. Every change to the server schema goes in a new file here.
  - One table per synced SQLite table (`SYNCED_TABLES` in `src/data/storage.ts`), with the same columns plus
    `owner_id` (the account, filled in from the session) and `updated_at` (set by the server, the pull cursor).
  - Row-level security: a signed-in account reads and adds only its own rows. Logs can't be changed after they are
    written. A custom activity can be replaced only by a version with a newer `at`.
  - A private `photos` bucket. Each account can only reach files under `<its user id>/`.
- `functions/delete-account/` is the Edge Function behind in-app account deletion. It removes the account's photos, then
  the account, which deletes every synced row with it.

## How the app will sync

- **Push:** `changesSince(cursor)` from `storage.ts`, then for each table an upsert with `ignoreDuplicates: true` for
  the logs and a plain upsert for `custom_activities`. Sending a row twice is harmless.
- **Pull:** pages of rows ordered by `(updated_at, id)` after the last row read, then `applyChanges`. Each sync starts a
  minute before the saved mark, in case another transaction committed late, and `applyChanges` skips rows it already has.
- **Rows:** booleans are 0 and 1 on the phone and real booleans on the server, and pulled `at` times are rewritten in the
  phone's format so "latest wins" compares them right. `reflections.photo` is sent as null until photo backup lands.
- **Photos:** upload to `photos/<user id>/<file name>` and store that path in the synced `reflections.photo`. The phone
  keeps showing its local copy.
- **Delete account:** `supabase.functions.invoke('delete-account', { method: 'POST' })` while signed in, then sign out
  and keep the local data.

## Keys

Only the **publishable key** and the project URL go into the app. They are safe in a client because row-level security
decides what each account can see. Never put the secret or service-role key in the app or in git.

Both are in the committed `.env`, so every build has them. To point a build at another project, override them as
environment variables (`.env.local` or EAS), the same way as `GOOGLE_MAPS_ANDROID_API_KEY`:

| Variable | Where it comes from |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Dashboard > Project Settings > Data API, or the project URL above |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Dashboard > Project Settings > API Keys > Publishable key (`sb_publishable_...`) |

- **Locally:** put both in `.env.local` (ignored by git).
- **EAS builds:** `npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value <url> --environment production --environment preview --environment development --visibility plaintext`,
  and the same for the publishable key.

## Sign-in

- **Apple on iPhone:** the system sheet (`expo-apple-authentication`), then `signInWithIdToken` with a hashed nonce.
- **Google, and Apple on Android:** Supabase's OAuth page in an in-app browser (`expo-web-browser`), which returns to
  `trysomethingnew://auth-callback` with a PKCE code for `exchangeCodeForSession`. `src/app/+native-intent.tsx` keeps
  the router from treating that link as a screen.

### Dashboard setup

- **Authentication > URL Configuration > Redirect URLs:** add `trysomethingnew://auth-callback`.
- **Authentication > Sign In / Providers > Apple:** turn it on. **Client IDs:** `com.pastureraised.trysomethingnew` (the
  bundle id, for the iPhone sheet), plus the Services ID (`com.pastureraised.trysomethingnew.signin`) for the browser
  flow on Android. **Secret Key (for OAuth):** a JWT made from the Sign in with Apple key (.p8), its Key ID and the Team
  ID. It expires after 6 months, so set a reminder to make a new one.
- **Apple Developer > Identifiers:** the App ID `com.pastureraised.trysomethingnew` has Sign in with Apple on (EAS
  turns it on during the first build with `usesAppleSignIn`). A Services ID `com.pastureraised.trysomethingnew.signin`
  with Sign in with Apple configured: primary App ID as above, domain `fueiospwqwukvqmwcfrn.supabase.co`, return URL
  `https://fueiospwqwukvqmwcfrn.supabase.co/auth/v1/callback`. **Keys:** one key with Sign in with Apple, for the JWT.
- **Authentication > Sign In / Providers > Google:** turn it on with the web client id
  `874671630872-85j12flv5atjsq3sjh6tpbm3lbom31oh.apps.googleusercontent.com` and its client secret. In Google Cloud,
  that web client's **Authorized redirect URIs** needs `https://fueiospwqwukvqmwcfrn.supabase.co/auth/v1/callback`.
  No iOS or Android client ids are needed for the browser flow.

## Applying changes

Migrations here were applied to the project with the Supabase connector. With the Supabase CLI instead:
`supabase link --project-ref fueiospwqwukvqmwcfrn` then `supabase db push`, and `supabase functions deploy delete-account`.
