import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * The website's host from EXPO_PUBLIC_WEB_URL, like "trysomething.new", or null when it isn't set.
 * Kept in step with webHost in src/data/web-links.ts, which the app uses for the same variable.
 */
function webHost(): string | null {
  const url = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (!url) return null;
  return url.replace(/^https?:\/\//i, '').split(/[/?#:]/)[0].toLowerCase() || null;
}

// app.json holds the static config. This file adds what has to come from the
// environment, so keys stay out of git.
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const host = webHost();
  return {
    ...base,
    // With a website, its activity pages open the same idea in the app when it's installed: universal links on
    // iOS and verified app links on Android. The site serves apple-app-site-association and assetlinks.json.
    // Changing these needs a new development build.
    ...(host && {
      ios: {
        ...base.ios,
        associatedDomains: [...new Set([...(base.ios?.associatedDomains ?? []), `applinks:${host}`])],
      },
      android: {
        ...base.android,
        intentFilters: [
          ...(base.android?.intentFilters ?? []),
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host, pathPrefix: '/activity' }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
    }),
    plugins: [
      ...(config.plugins ?? []),
      // Google Maps on Android needs a key. EAS builds read it from the
      // GOOGLE_MAPS_ANDROID_API_KEY environment variable; locally, put it in
      // .env.local. Without it the Android map renders blank. iOS uses Apple Maps.
      ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
    ],
  };
};
