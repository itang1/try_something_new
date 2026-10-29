import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the static config. This file adds what has to come from the
// environment, so keys stay out of git.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    // Google Maps on Android needs a key. EAS builds read it from the
    // GOOGLE_MAPS_ANDROID_API_KEY environment variable; locally, put it in
    // .env.local. Without it the Android map renders blank. iOS uses Apple Maps.
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
  ],
});
